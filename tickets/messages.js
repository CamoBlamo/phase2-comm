const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js')
const config = require('./config')
const {
    text, separator, unix, infoList,
    container, finish, v2, defs, typeDef, typeLabel,
} = require('./util')

function buildPanel(panelKey) {
    const panel = config.panels[panelKey]
    const kind = panelKey === 'orders' ? 'order' : 'support'
    const images = { bannerUrl: panel.bannerUrl, footerImageUrl: panel.footerImageUrl }

    const blocks = [`**${panel.titleEmoji ? `${panel.titleEmoji} ` : ''}${panel.title}**\n${panel.description}`]
    for (const s of panel.sections ?? []) {
        const body = s.lines?.length ? s.lines.map((l) => `- ${l}`).join('\n') : s.text ?? ''
        blocks.push(`**${s.emoji ? `${s.emoji} ` : ''}${s.title}**\n${body}`)
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(`tix:select:${kind}`)
        .setPlaceholder(panel.placeholder)
        .addOptions(
            Object.entries(defs(kind)).map(([key, d]) => {
                const option = new StringSelectMenuOptionBuilder().setLabel(d.label).setValue(key)
                if (d.description) option.setDescription(d.description.slice(0, 100))
                if (d.emoji) option.setEmoji(d.emoji)
                return option
            })
        )

    const c = container('panel', images)
        .addTextDisplayComponents(text(blocks.join('\n\n')))
        .addSeparatorComponents(separator())
        .addActionRowComponents(new ActionRowBuilder().addComponents(select))

    return v2(finish(c, 'panel', images), { allowedMentions: { parse: [] } })
}

function buildTicket(t) {
    const def = typeDef(t)
    const isOrder = t.kind === 'order'
    const claimed = Boolean(t.claimerId)
    const pings = [...(def?.roleIds ?? []).map((id) => `<@&${id}>`), `<@${t.openerId}>`].join(' | ')
    const priority = config.priorities[t.priority] ?? config.priorities.normal

    const c = container('ticket')
        .addTextDisplayComponents(
            text(`## ${typeLabel(t)}`),
            text(pings),
            text(isOrder ? config.orders.intro : config.support.intro)
        )

    if (t.answers?.length) {
        c.addTextDisplayComponents(
            text(`### ${isOrder ? 'Order' : 'Ticket'} Information\n` + infoList(t.answers.map((a) => [a.label, a.value || '*Not provided*'])))
        )
    }

    const details = []
    if (isOrder) {
        const status = config.orders.statuses[t.status] ?? Object.values(config.orders.statuses)[0]
        details.push(['Status', `${status.emoji} ${status.label}`])
        details.push(['Price', t.quote ? t.quote.amount : 'Not set'])
    }
    details.push(['Priority', `${priority.emoji} ${priority.label}`])
    details.push(['Claimed by', claimed ? `<@${t.claimerId}>` : 'Unclaimed'])
    if (isOrder && config.orders.terms.enabled) {
        details.push(['Terms', t.termsAcceptedAt ? `✅ Accepted <t:${unix(t.termsAcceptedAt)}:R>` : '⏳ Awaiting acceptance'])
    }
    details.push(['Opened', `<t:${unix(t.openedAt)}:F>`])

    c.addTextDisplayComponents(text(`### ${isOrder ? 'Order' : 'Ticket'} Details\n${infoList(details)}`))

    const buttons = [
        claimed
            ? new ButtonBuilder().setCustomId('tix:unclaim').setLabel('Unclaim').setStyle(ButtonStyle.Secondary)
            : new ButtonBuilder().setCustomId('tix:claim').setLabel('Claim').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tix:close').setLabel('Close').setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('tix:changetype')
            .setLabel(isOrder ? 'Change Type' : 'Change Category')
            .setStyle(ButtonStyle.Secondary),
    ]

    c.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons))

    return v2(finish(c, 'ticket'))
}

function buildTerms(t) {
    const terms = config.orders.terms
    const accepted = Boolean(t.termsAcceptedAt)

    const buttons = []
    if (!accepted) {
        buttons.push(new ButtonBuilder().setCustomId('tix:terms').setLabel('Accept').setStyle(ButtonStyle.Success))
    }
    if (terms.url) {
        buttons.push(new ButtonBuilder().setLabel('Order Terms').setStyle(ButtonStyle.Link).setURL(terms.url))
    }

    const c = container('notice').addTextDisplayComponents(
        text(accepted ? `✅ <@${t.openerId}> accepted the **Order Terms of Service** <t:${unix(t.termsAcceptedAt)}:R>.` : terms.text)
    )
    if (buttons.length) c.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons))

    return v2(finish(c, 'notice'), { allowedMentions: { parse: [] } })
}

function buildNotice(title, body, pings = {}) {
    const c = container('notice').addTextDisplayComponents(text(`### ${title}\n${body}`))
    return v2(finish(c, 'notice'), {
        allowedMentions: { users: pings.users ?? [], roles: pings.roles ?? [] },
    })
}

function buildCloseRequest(t, request, state = 'open', byUserId = null) {
    const lines = [`<@${request.by}> has requested to close this ticket.`]
    if (request.reason) lines.push(`**Reason:** ${request.reason}`)

    if (state === 'open') {
        lines.push('', `<@${t.openerId}>, please confirm. This ticket will close automatically <t:${unix(request.expiresAt)}:R> if there's no response.`)
    } else if (state === 'kept') {
        lines.push('', `❌ <@${byUserId}> chose to keep the ticket open.`)
    } else {
        lines.push('', `✅ <@${byUserId}> accepted. Closing ticket...`)
    }

    const c = container('notice').addTextDisplayComponents(text(`### Close Request\n${lines.join('\n')}`))

    if (state === 'open') {
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tix:creq:yes').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('tix:creq:no').setLabel('Keep Open').setStyle(ButtonStyle.Secondary)
            )
        )
    }

    return v2(finish(c, 'notice'), { allowedMentions: { users: state === 'open' ? [t.openerId] : [] } })
}

module.exports = { buildPanel, buildTicket, buildTerms, buildNotice, buildCloseRequest }