const {
    ChannelType,
    PermissionFlagsBits,
    MessageFlags,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js')
const config = require('./config')
const store = require('./store')
const { defs, typeLabel, ACCESS, channelName, pad, log } = require('./util')
const { buildPanel, buildTicket, buildTerms } = require('./messages')

const creating = new Set()

// Open tickets this user already has for a type (channels deleted by hand are ignored)
function openTickets(guild, userId, kind, type) {
    return store.all().filter((t) =>
        t.openerId === userId && t.kind === kind && t.type === type && guild.channels.cache.has(t.channelId)
    )
}

function blocked(guild, userId, kind, type) {
    const def = defs(kind)[type]
    if (!def) return 'That option no longer exists.'
    if (creating.has(`${userId}:${kind}:${type}`)) return `Your ${def.label} ticket is already being created.`

    const existing = openTickets(guild, userId, kind, type)
    if (existing.length >= config.MAX_OPEN_PER_TYPE) {
        return `You already have an open ${def.label} ticket: <#${existing[0].channelId}>`
    }
    return null
}

// source 'dash' = opened from a button (dashboard), not the panel dropdown
function buildForm(kind, type, source = null) {
    const def = defs(kind)[type]

    const labels = def.questions.slice(0, 5).map((q, i) => {
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

    return new ModalBuilder()
        .setCustomId(`tix:open:${kind}:${type}${source ? `:${source}` : ''}`)
        .setTitle((def.title ?? def.label).slice(0, 45))
        .addLabelComponents(...labels)
}

// ---------- Panel dropdown ----------

async function handleSelect(interaction, kind) {
    const type = interaction.values[0]
    const reason = blocked(interaction.guild, interaction.user.id, kind, type)

    if (reason) {
        await interaction.update(buildPanel(kind === 'order' ? 'orders' : 'support'))
        return interaction.followUp({ content: reason, flags: MessageFlags.Ephemeral })
    }

    const def = defs(kind)[type]
    if (!def.questions?.length) return createTicket(interaction, kind, type, [])

    await interaction.showModal(buildForm(kind, type))
}

// ---------- Buttons outside the panel (dashboard "I need assistance") ----------

async function openFromButton(interaction, kind, type) {
    const reason = blocked(interaction.guild, interaction.user.id, kind, type)
    if (reason) return interaction.reply({ content: reason, flags: MessageFlags.Ephemeral })

    const def = defs(kind)[type]
    if (!def.questions?.length) return createTicket(interaction, kind, type, [], false)

    await interaction.showModal(buildForm(kind, type, 'dash'))
}

async function handleFormSubmit(interaction, kind, type, source = null) {
    const def = defs(kind)[type]
    if (!def) return interaction.reply({ content: 'That option no longer exists.', flags: MessageFlags.Ephemeral })

    const answers = def.questions.slice(0, 5).map((q, i) => ({
        label: q.label,
        value: interaction.fields.getTextInputValue(`q${i}`).trim(),
    }))

    await createTicket(interaction, kind, type, answers, source !== 'dash')
}

// ---------- Create ----------

// fromPanel: reset the panel dropdown. Otherwise just reply privately (e.g. from the dashboard).
async function createTicket(interaction, kind, type, answers, fromPanel = true) {
    const guild = interaction.guild
    const user = interaction.user
    const def = defs(kind)[type]
    const lockKey = `${user.id}:${kind}:${type}`

    if (fromPanel) await interaction.update(buildPanel(kind === 'order' ? 'orders' : 'support'))
    else await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const reply = (content) => fromPanel
        ? interaction.followUp({ content, flags: MessageFlags.Ephemeral })
        : interaction.editReply({ content })

    // Re-check: two forms submitted at once
    const reason = blocked(guild, user.id, kind, type)
    if (reason) return reply(reason)

    creating.add(lockKey)
    try {
        const ticket = {
            number: store.nextNumber(),
            kind,
            type,
            openerId: user.id,
            claimerId: null,
            claimedAt: null,
            answers,
            openedAt: Date.now(),
            priority: 'normal',
            status: kind === 'order' ? Object.keys(config.orders.statuses)[0] : null,
            quote: null,
            termsAcceptedAt: kind === 'order' && config.orders.terms.enabled ? null : Date.now(),
            messageId: null,
            termsMessageId: null,
            threadId: null,
            addedUsers: [],
            closeRequest: null,
        }

        const staffRoles = [...new Set([...config.MANAGER_ROLE_IDS, ...def.roleIds])].filter(Boolean)

        const channel = await guild.channels.create({
            name: channelName(def, interaction.member, user),
            type: ChannelType.GuildText,
            parent: def.parentId || null,
            topic: `${typeLabel(ticket)} #${pad(ticket.number)} · opened by ${user.tag}`,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: ACCESS },
                ...staffRoles.map((id) => ({ id, allow: ACCESS })),
                {
                    id: interaction.client.user.id,
                    allow: [
                        ...ACCESS,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageThreads,
                        PermissionFlagsBits.CreatePublicThreads,
                    ],
                },
            ],
        })

        store.set(channel.id, ticket)

        const main = await channel.send({
            ...buildTicket(ticket),
            allowedMentions: { users: [user.id], roles: def.roleIds },
        })
        ticket.messageId = main.id

        if (kind === 'order' && config.orders.terms.enabled) {
            const terms = await channel.send(buildTerms(ticket))
            ticket.termsMessageId = terms.id
        }

        if (kind === 'order' && config.orders.references.enabled) {
            try {
                const thread = await main.startThread({
                    name: config.orders.references.threadName,
                    autoArchiveDuration: 10080,
                })
                await thread.send({
                    content: `<@${user.id}> - ${config.orders.references.message}`,
                    allowedMentions: { users: [user.id] },
                })
                ticket.threadId = thread.id
            } catch (err) {
                console.error('[Tickets] Failed to create references thread:', err.message)
            }
        }

        store.set(channel.id, ticket)

        await reply(`Your ticket has been created: ${channel}`)
        await log(interaction.client, '🎫 Ticket Opened', [
            `${typeLabel(ticket)} #${pad(ticket.number)} · ${channel}`,
            `-# Opened by <@${user.id}>`,
        ])
    } finally {
        creating.delete(lockKey)
    }
}

module.exports = { handleSelect, handleFormSubmit, openFromButton }