const {
    MessageFlags,
    AttachmentBuilder,
    FileBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require('discord.js')
const config = require('./config')
const store = require('./store')
const {
    text, separator, unix, pad, truncate, quote, infoList,
    container, finish, v2, typeDef, typeLabel, isManager, canClose, canManage, log,
} = require('./util')
const { buildNotice, buildCloseRequest } = require('./messages')

const closing = new Set() // channel IDs being closed

// ---------- Transcript ----------

async function fetchAll(channel) {
    const all = []
    let before
    while (true) {
        const batch = await channel.messages.fetch({ limit: 100, before })
        if (batch.size === 0) break
        all.push(...batch.values())
        before = batch.last().id
        if (batch.size < 100) break
    }
    return all.reverse()
}

// Text out of Components V2 messages
function extractText(components = []) {
    const out = []
    for (const c of components) {
        if (typeof c.content === 'string') out.push(c.content)
        if (Array.isArray(c.components)) out.push(...extractText(c.components))
    }
    return out
}

const stamp = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

function messageLines(messages) {
    const lines = []
    for (const m of messages) {
        const parts = []
        if (m.content) parts.push(m.content)
        parts.push(...extractText(m.components))
        for (const e of m.embeds) {
            if (e.title) parts.push(`[Embed] ${e.title}`)
            if (e.description) parts.push(e.description)
        }
        for (const a of m.attachments.values()) parts.push(`[Attachment] ${a.url}`)

        lines.push(`[${stamp(m.createdTimestamp)}] ${m.author.tag} (${m.author.id})`)
        lines.push(parts.length ? parts.join('\n') : '[no content]')
        lines.push('')
    }
    return lines
}

async function buildTranscript(channel, t, closedBy, reason) {
    const users = channel.client.users.cache
    const who = (id) => (id ? `${users.get(id)?.tag ?? 'Unknown'} (${id})` : 'None')

    const messages = await fetchAll(channel)

    let threadMessages = []
    if (t.threadId) {
        const thread = await channel.client.channels.fetch(t.threadId).catch(() => null)
        if (thread) threadMessages = await fetchAll(thread).catch(() => [])
    }

    const lines = [
        `Ticket: #${channel.name} (#${pad(t.number)})`,
        `Type: ${t.kind === 'order' ? 'Order' : 'Support'} - ${typeLabel(t)}`,
        `Opened by: ${who(t.openerId)}`,
        `Claimed by: ${who(t.claimerId)}`,
        `Closed by: ${closedBy.tag} (${closedBy.id})`,
        `Close reason: ${reason}`,
        `Opened at: ${stamp(t.openedAt)}`,
        `Closed at: ${stamp(Date.now())}`,
    ]
    if (t.kind === 'order') {
        lines.push(`Status: ${config.orders.statuses[t.status]?.label ?? t.status}`)
        lines.push(`Price: ${t.quote?.amount ?? 'Not set'}`)
        if (config.orders.terms.enabled) lines.push(`Terms accepted: ${t.termsAcceptedAt ? stamp(t.termsAcceptedAt) : 'No'}`)
    }
    lines.push(`Messages: ${messages.length}${t.threadId ? ` (+${threadMessages.length} in references)` : ''}`)

    if (t.answers?.length) {
        lines.push('', '--- Opening Details ---')
        for (const a of t.answers) lines.push(`${a.label}:`, a.value || '(not provided)', '')
    }

    lines.push('='.repeat(60), '', ...messageLines(messages))

    if (threadMessages.length) {
        lines.push('='.repeat(60), `--- ${config.orders.references.threadName} thread ---`, '', ...messageLines(threadMessages))
    }

    return { body: lines.join('\n'), count: messages.length }
}

async function sendTranscript(channel, t, closedBy, reason) {
    if (!config.TRANSCRIPT_CHANNEL_ID) return

    const { body, count } = await buildTranscript(channel, t, closedBy, reason)
    const fileName = `${channel.name}-${pad(t.number)}.txt`
    const transcriptChannel = await channel.client.channels.fetch(config.TRANSCRIPT_CHANNEL_ID)

    const details = [
        ['Ticket', `#${channel.name}`],
        ['Type', `${typeDef(t)?.emoji ?? ''} ${typeLabel(t)}`.trim()],
        ['Opened by', `<@${t.openerId}>`],
        ['Claimed by', t.claimerId ? `<@${t.claimerId}>` : 'Unclaimed'],
        ['Closed by', `<@${closedBy.id}>`],
        ['Opened', `<t:${unix(t.openedAt)}:F>`],
    ]
    if (t.kind === 'order') {
        details.push(['Status', config.orders.statuses[t.status]?.label ?? t.status])
        details.push(['Price', t.quote?.amount ?? 'Not set'])
    }
    details.push(['Messages', count])

    const c = container('transcript')
        .addTextDisplayComponents(
            text(`## 🔒 Ticket Closed · #${pad(t.number)}`),
            text(infoList(details))
        )

    if (t.answers?.length) {
        c.addSeparatorComponents(separator()).addTextDisplayComponents(
            text(`### ${t.kind === 'order' ? 'Order' : 'Ticket'} Information\n` +
                infoList(t.answers.map((a) => [a.label, truncate(a.value || '*Not provided*', 300)])))
        )
    }

    c.addSeparatorComponents(separator())
        .addTextDisplayComponents(text(`### Close Reason\n${quote(reason)}`))
        .addFileComponents(new FileBuilder().setURL(`attachment://${fileName}`))

    await transcriptChannel.send(v2(finish(c, 'transcript'), {
        files: [new AttachmentBuilder(Buffer.from(body, 'utf8'), { name: fileName })],
        allowedMentions: { parse: [] },
    }))
}

// ---------- DM + review ----------

async function dmOpener(client, t, closedBy, reason) {
    if (!config.DM_ON_CLOSE) return
    const user = await client.users.fetch(t.openerId).catch(() => null)
    if (!user) return

    const wantsReview = t.kind === 'order' && config.orders.reviews.enabled && config.REVIEW_CHANNEL_ID

    const c = container('dm').addTextDisplayComponents(
        text(`## 🔒 Your ${t.kind === 'order' ? 'order' : 'ticket'} was closed`),
        text(infoList([
            ['Ticket', `${typeLabel(t)} #${pad(t.number)}`],
            ['Closed by', closedBy.tag],
            ['Reason', reason],
        ]))
    )

    if (wantsReview) {
        // Everything the review needs lives in the button itself, so it keeps
        // working no matter what happens to the data file after the DM is sent.
        c.addSeparatorComponents(separator())
            .addTextDisplayComponents(text('How did we do? Leave a review for your order below.'))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`tix:review:${t.number}:${t.type}:${t.claimerId ?? '0'}`)
                        .setLabel('Leave a Review')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Primary)
                )
            )
    }

    await user.send(v2(finish(c, 'dm'))).catch(() => {}) // DMs closed
}

// Button / form IDs: tix:review:<number>:<type>:<claimerId>
function parseReview(number, type, claimerId) {
    const def = config.orders.services[type]
    return {
        number: Number(number),
        type,
        claimerId: claimerId && claimerId !== '0' ? claimerId : null,
        label: def?.title ?? def?.label ?? 'Order',
    }
}

const alreadyReviewed = (interaction) =>
    interaction.reply({ content: 'You already left a review for this order. Thank you!', flags: MessageFlags.Ephemeral })

async function handleReviewButton(interaction, number, type, claimerId) {
    // Old buttons (sent before this update) only had the number
    if (!type) {
        const old = store.getReview(Number(number))
        if (!old) return interaction.reply({ content: 'This review link is from an older version and has expired. Sorry!', flags: MessageFlags.Ephemeral })
        type = old.type
        claimerId = old.claimerId ?? '0'
    }

    const review = parseReview(number, type, claimerId)
    if (store.isReviewed(review.number)) return alreadyReviewed(interaction)

    const modal = new ModalBuilder()
        .setCustomId(`tix:reviewform:${review.number}:${review.type}:${review.claimerId ?? '0'}`)
        .setTitle(`Review ${review.label}`.slice(0, 45))
        .addLabelComponents(
            new LabelBuilder()
                .setLabel('Rating')
                .setDescription('A number from 1 to 5')
                .setTextInputComponent(
                    new TextInputBuilder().setCustomId('rating').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(1).setPlaceholder('5')
                ),
            new LabelBuilder()
                .setLabel('Feedback')
                .setTextInputComponent(
                    new TextInputBuilder().setCustomId('feedback').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)
                )
        )

    await interaction.showModal(modal)
}

// Swap the review button on the DM for a "submitted" line so it can't be pressed again
function withoutReviewButton(message) {
    const json = message.components.map((c) => (c.toJSON ? c.toJSON() : c))
    const box = json.find((c) => c.type === ComponentType.Container)
    if (!box) return null

    const index = box.components.findIndex((c) => c.type === ComponentType.ActionRow)
    if (index === -1) return null
    box.components.splice(index, 1, { type: ComponentType.TextDisplay, content: '✅ **Review submitted.** Thank you!' })
    return json
}

// Same layout as the /review command: banner, New Review, details, footer image.
// Star emoji: orders.reviews.starEmoji in config (falls back to your /review star).
function buildReviewPost(designerId, submitterId, rating, feedback) {
    const star = config.orders.reviews.starEmoji ?? '<:Star:1475265205960179825>'
    const banner = config.display.review?.banner && config.images.bannerUrl
    const footer = config.display.review?.footer && config.images.footerImageUrl
    const largeSeparator = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    const image = (url) => new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url))

    const c = new ContainerBuilder()
    if (banner) c.addMediaGalleryComponents(image(banner)).addSeparatorComponents(largeSeparator())

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## New Review'),
        new TextDisplayBuilder().setContent(
            `**Review for:** ${designerId ? `<@${designerId}>` : 'N/A'}\n` +
            `**Rating:** ${star.repeat(rating)}\n` +
            `**Submitted by:** <@${submitterId}>\n` +
            `**Reason:** ${feedback}`
        )
    )

    if (footer) c.addSeparatorComponents(largeSeparator()).addMediaGalleryComponents(image(footer))

    return {
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: designerId ? [designerId] : [] },
    }
}

async function handleReviewSubmit(interaction, number, type, claimerId) {
    const review = parseReview(number, type, claimerId)
    if (store.isReviewed(review.number)) return alreadyReviewed(interaction)

    const rating = Number(interaction.fields.getTextInputValue('rating'))
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return interaction.reply({ content: 'Rating has to be a number from 1 to 5. Press the button to try again.', flags: MessageFlags.Ephemeral })
    }
    const feedback = interaction.fields.getTextInputValue('feedback').trim()

    const channel = await interaction.client.channels.fetch(config.REVIEW_CHANNEL_ID).catch(() => null)
    if (!channel) {
        console.error('[Tickets] REVIEW_CHANNEL_ID is missing or the bot can\'t see it.')
        return interaction.reply({ content: 'Reviews aren\'t set up right now. Sorry!', flags: MessageFlags.Ephemeral })
    }

    // Mark first so a double submit can't post twice
    store.markReviewed(review.number)

    try {
        await channel.send(buildReviewPost(review.claimerId, interaction.user.id, rating, feedback))
    } catch (err) {
        store.unmarkReviewed(review.number)
        console.error('[Tickets] Failed to post review:', err.message)
        return interaction.reply({ content: 'Your review couldn\'t be posted. Please try again in a bit.', flags: MessageFlags.Ephemeral })
    }

    const updated = interaction.isFromMessage?.() && interaction.message ? withoutReviewButton(interaction.message) : null
    if (updated) {
        await interaction.update({ components: updated, flags: MessageFlags.IsComponentsV2 })
        await interaction.followUp({ content: 'Thanks for your review! ⭐', flags: MessageFlags.Ephemeral }).catch(() => {})
    } else {
        await interaction.reply({ content: 'Thanks for your review! ⭐', flags: MessageFlags.Ephemeral })
    }
}

// ---------- Close ----------

// Shared by the Close button, /ticket close, close requests and auto-close.
async function performClose(channel, t, closedBy, reason) {
    if (closing.has(channel.id)) return { error: 'This ticket is already closing.' }
    closing.add(channel.id)

    const deleteAt = Date.now() + config.CLOSE_DELAY_SECONDS * 1000

    await channel.send(buildNotice(
        '🔒 Ticket Closing',
        `Closed by <@${closedBy.id}>.\n**Reason:** ${reason}\n\nSaving transcript. This channel will be deleted <t:${unix(deleteAt)}:R>.`
    )).catch(() => {})

    try {
        await sendTranscript(channel, t, closedBy, reason)
    } catch (err) {
        console.error('[Tickets] Transcript failed:', err)
        closing.delete(channel.id)
        await channel.send('Transcript failed to save, so the channel was **not** deleted. Check the console and try again.').catch(() => {})
        return { error: 'Transcript failed to save. The ticket was not closed.' }
    }

    await dmOpener(channel.client, t, closedBy, reason)
    await log(channel.client, '🔒 Ticket Closed', [
        `${typeLabel(t)} #${pad(t.number)} · #${channel.name}`,
        `-# Closed by <@${closedBy.id}> · ${truncate(reason, 200)}`,
    ])

    setTimeout(() => {
        channel.delete(`Ticket closed by ${closedBy.tag}`)
            .then(() => store.remove(channel.id))
            .catch((err) => console.error('[Tickets] Failed to delete channel:', err.message))
            .finally(() => closing.delete(channel.id))
    }, config.CLOSE_DELAY_SECONDS * 1000)

    return { ok: 'Closing ticket...' }
}

function closeModal() {
    return new ModalBuilder()
        .setCustomId('tix:closeform')
        .setTitle('Close Ticket')
        .addLabelComponents(
            new LabelBuilder()
                .setLabel('Reason')
                .setDescription('Optional. Shown in the transcript and sent to the opener.')
                .setTextInputComponent(
                    new TextInputBuilder().setCustomId('reason').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
                )
        )
}

function closeError(member, t, channelId) {
    if (closing.has(channelId)) return 'This ticket is already closing.'
    if (canClose(member, t)) return null
    if (member.id === t.openerId && t.kind === 'order') {
        return 'You can\'t close your own order. Ask your designer to send a close request.'
    }
    if (t.claimerId) return `Only the claimer (<@${t.claimerId}>) or a manager can close this ticket.`
    return t.kind === 'order'
        ? 'You can\'t close this order. Staff can send a close request for you to accept.'
        : 'You can\'t close this ticket.'
}

// ---------- Close requests ----------

async function requestClose(channel, t, member, reason) {
    if (!canManage(member, t)) return { error: 'You can\'t send a close request on this ticket.' }
    if (t.closeRequest) return { error: 'There is already a close request waiting for a response.' }
    if (closing.has(channel.id)) return { error: 'This ticket is already closing.' }

    const request = {
        by: member.id,
        reason: reason || null,
        expiresAt: Date.now() + config.CLOSE_REQUEST_HOURS * 3_600_000,
        messageId: null,
    }

    const message = await channel.send(buildCloseRequest(t, request))
    request.messageId = message.id
    t.closeRequest = request
    store.set(channel.id, t)

    return { ok: 'Close request sent.' }
}

async function answerCloseRequest(interaction, channel, t, accept) {
    const request = t.closeRequest
    if (!request || request.messageId !== interaction.message.id) {
        return interaction.reply({ content: 'This close request is no longer active.', flags: MessageFlags.Ephemeral })
    }
    if (interaction.user.id !== t.openerId && !isManager(interaction.member)) {
        return interaction.reply({ content: 'Only the person who opened this ticket can answer.', flags: MessageFlags.Ephemeral })
    }

    t.closeRequest = null
    store.set(channel.id, t)

    await interaction.update(buildCloseRequest(t, request, accept ? 'accepted' : 'kept', interaction.user.id))

    if (accept) {
        await performClose(channel, t, interaction.user, request.reason || 'Close request accepted')
    }
}

// Auto-close requests nobody answered
async function checkCloseRequests(client) {
    const now = Date.now()
    for (const t of store.all()) {
        if (!t.closeRequest || t.closeRequest.expiresAt > now) continue

        const channel = await client.channels.fetch(t.channelId).catch(() => null)
        if (!channel) {
            store.remove(t.channelId)
            continue
        }

        const request = t.closeRequest
        t.closeRequest = null
        store.set(t.channelId, t)

        const by = await client.users.fetch(request.by).catch(() => client.user)
        await performClose(channel, t, by, `${request.reason ? `${request.reason} ` : ''}(close request expired with no response)`)
    }
}

module.exports = {
    performClose, closeModal, closeError,
    requestClose, answerCloseRequest, checkCloseRequests,
    handleReviewButton, handleReviewSubmit,
}