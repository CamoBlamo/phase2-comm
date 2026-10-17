const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
    FileBuilder,
    ComponentType,
    ContainerBuilder,
} = require('discord.js')
const config = require('./config')
const store = require('./store')
const { text, separator, unix, quote, truncate, withBanner, withFooter, v2 } = require('./ui')
const { isManager } = require('../tickets/util')

const apps = config.applications
const PAGE_SIZE = 5 // Discord allows 5 inputs per form
const ANSWER_BUDGET = 3000 // characters of answers that fit in the review message

const sessions = new Map() // "<userId>:<position>" -> { answers, page, expires }
const handling = new Set() // review message IDs mid-decision

const ephemeral = (interaction, content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } })

// ---------- Positions ----------

function position(key) {
    return apps.positions[key] ?? null
}

function isOpen(key) {
    const override = store.load().open[key]
    return override ?? position(key)?.open ?? false
}

function pagesFor(pos) {
    const pages = []
    for (let i = 0; i < pos.questions.length; i += PAGE_SIZE) pages.push(pos.questions.slice(i, i + PAGE_SIZE))
    return pages
}

function canReview(member, key) {
    if (isManager(member)) return true
    const roles = position(key)?.reviewerRoleIds?.length ? position(key).reviewerRoleIds : apps.REVIEWER_ROLE_IDS
    return roles.length > 0 && member.roles.cache.hasAny(...roles)
}

// Returns why this member can't apply, or null
function blocked(member, key) {
    const pos = position(key)
    if (!pos) return 'That position doesn\'t exist.'
    if (!isOpen(key)) return `${pos.label} applications are closed right now.`
    if (pos.requiredRoleIds?.length && !member.roles.cache.hasAny(...pos.requiredRoleIds)) {
        return `You don't meet the requirements to apply for ${pos.label}.`
    }
    if (pos.acceptAddRoleIds?.length && member.roles.cache.hasAny(...pos.acceptAddRoleIds)) {
        return `You're already part of ${pos.label}.`
    }

    const data = store.load()
    const k = store.key(member.id, key)
    if (data.pending[k]) return `You already have a ${pos.label} application waiting for review.`

    const until = data.cooldowns[k]
    if (until && until > Date.now()) return `You can apply for ${pos.label} again <t:${unix(until)}:R>.`
    return null
}

// ---------- Applications menu (ephemeral) ----------

function buildMenu() {
    const entries = Object.entries(apps.positions)
    const lines = entries.map(([key, p]) =>
        `**${p.emoji ? `${p.emoji} ` : ''}${p.label}** · ${isOpen(key) ? '🟢 Open' : '🔴 Closed'}\n${quote(p.description ?? '')}`
    )

    const c = withBanner(apps)
        .addTextDisplayComponents(text(`## ${apps.title}\n${apps.description}`))
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(text(lines.join('\n\n') || 'No positions are set up yet.'))

    const open = entries.filter(([key]) => isOpen(key))
    if (open.length) {
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('app:select')
                    .setPlaceholder(apps.placeholder)
                    .addOptions(open.map(([key, p]) => {
                        const o = new StringSelectMenuOptionBuilder().setLabel(p.label).setValue(key)
                        if (p.description) o.setDescription(p.description.slice(0, 100))
                        if (p.emoji) o.setEmoji(p.emoji)
                        return o
                    }))
            )
        )
    } else {
        c.addTextDisplayComponents(text('-# No positions are open right now. Check back later!'))
    }

    return {
        components: [withFooter(c, apps)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
    }
}

async function openMenu(interaction) {
    await interaction.reply(buildMenu())
}

// Small CV2 status box used to update the ephemeral menu as they go
function statusBox(content, button = null) {
    const c = new ContainerBuilder().addTextDisplayComponents(text(content))
    if (button) c.addActionRowComponents(new ActionRowBuilder().addComponents(button))
    return { components: [c], flags: MessageFlags.IsComponentsV2 }
}

// ---------- Form ----------

function buildForm(key, pageIndex) {
    const pos = position(key)
    const pages = pagesFor(pos)

    const labels = pages[pageIndex].map((q, j) => {
        const i = pageIndex * PAGE_SIZE + j
        const input = new TextInputBuilder()
            .setCustomId(`q${i}`)
            .setStyle(q.style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
            .setRequired(q.required !== false)
            .setMaxLength(q.maxLength ?? 1000)
        if (q.minLength) input.setMinLength(q.minLength)
        if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100))

        const label = new LabelBuilder().setLabel(q.label.slice(0, 45)).setTextInputComponent(input)
        if (q.description) label.setDescription(q.description.slice(0, 100))
        return label
    })

    const title = pages.length > 1 ? `${pos.label} Application (${pageIndex + 1}/${pages.length})` : `${pos.label} Application`

    return new ModalBuilder()
        .setCustomId(`app:form:${key}:${pageIndex}`)
        .setTitle(title.slice(0, 45))
        .addLabelComponents(...labels)
}

function getSession(userId, key) {
    const k = store.key(userId, key)
    const s = sessions.get(k)
    if (!s || s.expires < Date.now()) {
        sessions.delete(k)
        return null
    }
    return s
}

async function handleSelect(interaction) {
    const key = interaction.values[0]
    const reason = blocked(interaction.member, key)
    if (reason) return ephemeral(interaction, reason)

    const pos = position(key)
    if (!pos.questions.length) return ephemeral(interaction, 'This position has no questions set up yet.')

    sessions.set(store.key(interaction.user.id, key), {
        answers: [],
        page: 0,
        expires: Date.now() + apps.SESSION_MINUTES * 60_000,
    })

    await interaction.showModal(buildForm(key, 0))
}

async function handleFormSubmit(interaction, key, pageIndex) {
    const pos = position(key)
    const session = pos && getSession(interaction.user.id, key)
    const respond = (payload) => (interaction.isFromMessage() ? interaction.update(payload) : interaction.reply({ ...payload, flags: payload.flags | MessageFlags.Ephemeral }))

    if (!session || session.page !== pageIndex) {
        return respond(statusBox('Your application session expired. Open the dashboard and press **Applications** to start again.'))
    }

    const pages = pagesFor(pos)
    pages[pageIndex].forEach((q, j) => {
        const i = pageIndex * PAGE_SIZE + j
        session.answers[i] = { label: q.label, value: interaction.fields.getTextInputValue(`q${i}`).trim() }
    })
    session.page++

    if (session.page < pages.length) {
        return respond(statusBox(
            `**${pos.label} Application**\nPage ${pageIndex + 1}/${pages.length} saved. Press continue for the next questions.`,
            new ButtonBuilder()
                .setCustomId(`app:next:${key}`)
                .setLabel(`Continue (${session.page + 1}/${pages.length})`)
                .setStyle(ButtonStyle.Primary)
        ))
    }

    sessions.delete(store.key(interaction.user.id, key))

    // Re-check in case something changed while they were filling it out
    const reason = blocked(interaction.member, key)
    if (reason) return respond(statusBox(reason))

    const result = await submit(interaction, key, session.answers)
    return respond(statusBox(result.error ?? `✅ **Application submitted!**\nYour ${pos.label} application has been sent to our team. You'll get a DM when it's reviewed.`))
}

async function handleNext(interaction, key) {
    const session = getSession(interaction.user.id, key)
    if (!session) {
        return interaction.update(statusBox('Your application session expired. Open the dashboard and press **Applications** to start again.'))
    }
    await interaction.showModal(buildForm(key, session.page))
}

// ---------- Submit to review channel ----------

function formatAnswers(answers) {
    const full = answers.map((a, i) => `**${i + 1}. ${a.label}**\n${a.value ? quote(a.value) : '> *Not provided*'}`)
    const total = full.join('\n\n').length
    if (total <= ANSWER_BUDGET) return { text: full.join('\n\n'), truncated: false }

    const each = Math.max(80, Math.floor(ANSWER_BUDGET / answers.length) - 40)
    const short = answers.map((a, i) => `**${i + 1}. ${a.label}**\n${a.value ? quote(truncate(a.value, each)) : '> *Not provided*'}`)
    return { text: short.join('\n\n'), truncated: true }
}

async function submit(interaction, key, answers) {
    const pos = position(key)
    const channel = await interaction.client.channels.fetch(apps.REVIEW_CHANNEL_ID).catch(() => null)
    if (!channel) {
        console.error('[Applications] REVIEW_CHANNEL_ID is missing or the bot can\'t see it.')
        return { error: 'Applications aren\'t set up correctly right now. Please let staff know.' }
    }

    const user = interaction.user
    const member = interaction.member
    const k = store.key(user.id, key)

    // Reserve before sending so a double submit can't create two
    const data = store.load()
    data.pending[k] = { messageId: null, submittedAt: Date.now() }
    store.save(data)

    const { text: answerText, truncated } = formatAnswers(answers)
    const fileName = `application-${pos.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.username}.txt`.slice(0, 100)

    const c = new ContainerBuilder()
        .addTextDisplayComponents(
            text(`## 📝 ${pos.emoji ? `${pos.emoji} ` : ''}${pos.label} Application`),
            text(
                '### Applicant\n' +
                `- **User:** <@${user.id}> (${user.tag})\n` +
                `- **Account created:** <t:${unix(user.createdTimestamp)}:R>\n` +
                `- **Joined server:** ${member.joinedTimestamp ? `<t:${unix(member.joinedTimestamp)}:R>` : 'Unknown'}\n` +
                `- **Submitted:** <t:${unix()}:F>`
            )
        )
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(text(`### Answers\n${answerText}`))

    const files = []
    if (truncated) {
        const full = answers.map((a, i) => `${i + 1}. ${a.label}\n${a.value || '(not provided)'}\n`).join('\n')
        files.push(new AttachmentBuilder(Buffer.from(`${pos.label} application - ${user.tag} (${user.id})\n\n${full}`, 'utf8'), { name: fileName }))
        c.addTextDisplayComponents(text('-# Some answers were shortened. Full answers are in the file below.'))
            .addFileComponents(new FileBuilder().setURL(`attachment://${fileName}`))
    }

    c.addSeparatorComponents(separator())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`app:accept:${user.id}:${key}`).setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`app:deny:${user.id}:${key}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
            )
        )

    const pings = (pos.pingRoleIds ?? []).map((id) => `<@&${id}>`).join(' ')
    if (pings) c.addTextDisplayComponents(text(`-# ${pings}`))

    try {
        const message = await channel.send({
            components: [c],
            files,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { roles: pos.pingRoleIds ?? [], users: [] },
        })
        const after = store.load()
        after.pending[k] = { messageId: message.id, submittedAt: Date.now() }
        store.save(after)
        return { ok: true }
    } catch (err) {
        const after = store.load()
        delete after.pending[k]
        store.save(after)
        console.error('[Applications] Failed to send application:', err)
        return { error: 'Your application couldn\'t be sent. Please try again in a bit.' }
    }
}

// ---------- Accept / deny ----------

async function handleDecisionButton(interaction, decision, userId, key) {
    if (!canReview(interaction.member, key)) return ephemeral(interaction, 'You can\'t review these applications.')

    const accept = decision === 'accept'
    await interaction.showModal(
        new ModalBuilder()
            .setCustomId(`app:${decision}form:${userId}:${key}`)
            .setTitle(accept ? 'Accept Application' : 'Deny Application')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel(accept ? 'Note' : 'Reason')
                    .setDescription('Optional. Sent to the applicant.')
                    .setTextInputComponent(
                        new TextInputBuilder().setCustomId('note').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
                    )
            )
    )
}

// Remove the buttons + ping line and add the result
function resolvedComponents(message, line) {
    const json = message.components.map((c) => (c.toJSON ? c.toJSON() : c))
    const box = json.find((c) => c.type === ComponentType.Container)
    box.components = box.components.filter((c) =>
        c.type !== ComponentType.ActionRow && !(c.type === ComponentType.TextDisplay && c.content.startsWith('-# <@&'))
    )
    box.components.push({ type: ComponentType.TextDisplay, content: line })
    return json
}

async function dmResult(client, userId, pos, accepted, reviewer, note, cooldownUntil) {
    if (!apps.DM_RESULTS) return true

    const lines = [
        accepted
            ? `Congratulations! Your **${pos.label}** application was **accepted**.`
            : `Your **${pos.label}** application was **denied**.`,
        '',
        `**Reviewed by:** ${reviewer.tag}`,
    ]
    if (note) lines.push(`**${accepted ? 'Note' : 'Reason'}:** ${note}`)
    if (cooldownUntil) lines.push(`You can apply again <t:${unix(cooldownUntil)}:R>.`)

    const c = withBanner(apps)
        .addTextDisplayComponents(text(`## ${accepted ? '✅' : '❌'} Application ${accepted ? 'Accepted' : 'Denied'}`), text(lines.join('\n')))

    try {
        const user = await client.users.fetch(userId)
        await user.send(v2(withFooter(c, apps)))
        return true
    } catch {
        return false
    }
}

async function handleDecisionSubmit(interaction, decision, userId, key) {
    if (!canReview(interaction.member, key)) return ephemeral(interaction, 'You can\'t review these applications.')

    const messageId = interaction.message?.id
    if (handling.has(messageId)) return ephemeral(interaction, 'This application is already being handled.')
    handling.add(messageId)

    try {
        const pos = position(key)
        const data = store.load()
        const k = store.key(userId, key)

        if (!pos || data.pending[k]?.messageId !== messageId) {
            return ephemeral(interaction, 'This application was already handled.')
        }

        await interaction.deferUpdate()

        const accepted = decision === 'accept'
        const note = interaction.fields.getTextInputValue('note').trim()

        if (accepted && (pos.acceptAddRoleIds?.length || pos.acceptRemoveRoleIds?.length)) {
            try {
                const member = await interaction.guild.members.fetch(userId)
                if (pos.acceptAddRoleIds?.length) await member.roles.add(pos.acceptAddRoleIds, `${pos.label} application accepted`)
                if (pos.acceptRemoveRoleIds?.length) await member.roles.remove(pos.acceptRemoveRoleIds, `${pos.label} application accepted`)
            } catch (err) {
                console.error('[Applications] Failed to update roles:', err.message)
                return interaction.followUp({
                    content: `Couldn't update their roles (${err.message}). Make sure they're still in the server, the bot has **Manage Roles**, and it's above those roles. The application is still pending.`,
                    flags: MessageFlags.Ephemeral,
                })
            }
        }

        let cooldownUntil = null
        if (!accepted && pos.denyCooldownHours > 0) {
            cooldownUntil = Date.now() + pos.denyCooldownHours * 3_600_000
            data.cooldowns[k] = cooldownUntil
        }
        delete data.pending[k]
        store.save(data)

        const dmSent = await dmResult(interaction.client, userId, pos, accepted, interaction.user, note, cooldownUntil)

        const line = [
            `${accepted ? '✅ **Accepted**' : '❌ **Denied**'} by <@${interaction.user.id}> <t:${unix()}:R>`,
            note ? `**${accepted ? 'Note' : 'Reason'}:** ${note}` : null,
            dmSent ? null : '-# Couldn\'t DM the applicant (DMs closed).',
        ].filter(Boolean).join('\n')

        await interaction.editReply({
            components: resolvedComponents(interaction.message, line),
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
        })
    } finally {
        handling.delete(messageId)
    }
}

// ---------- Staff controls (!apps) ----------

function setOpen(key, open) {
    const data = store.load()
    data.open[key] = open
    store.save(data)
}

function resetUser(userId, key) {
    const data = store.load()
    const k = store.key(userId, key)
    const had = Boolean(data.pending[k] || data.cooldowns[k])
    delete data.pending[k]
    delete data.cooldowns[k]
    store.save(data)
    return had
}

function summary() {
    const data = store.load()
    return Object.entries(apps.positions).map(([key, p]) => {
        const pending = Object.keys(data.pending).filter((k) => k.endsWith(`:${key}`)).length
        return `${isOpen(key) ? '🟢' : '🔴'} **${p.label}** (\`${key}\`) · ${pending} pending`
    })
}

module.exports = {
    openMenu, handleSelect, handleFormSubmit, handleNext,
    handleDecisionButton, handleDecisionSubmit,
    position, setOpen, resetUser, summary,
}