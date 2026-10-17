const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const config = require('./config')
const { text, quote, withBanner, withFooter, v2 } = require('./ui')

function buildButton(b, i) {
    const button = new ButtonBuilder().setLabel(b.label)

    switch (b.type) {
        case 'link':
                button.setStyle(ButtonStyle.Link).setURL(b.url)
                break
        case 'page':
                button.setStyle(ButtonStyle.Secondary).setCustomId(`dash:page:${b.page}`)
                break
        case 'applications':
                button.setStyle(ButtonStyle.Secondary).setCustomId('dash:apply')
                break
        case 'ticket':
                button.setStyle(ButtonStyle.Secondary).setCustomId(`dash:ticket:${b.kind}:${b.ticketType}`)
                break
        default:
            throw new Error(`Dashboard Buttons ${i + i} has a unknown type ${b.type}`)
    }

    if (b.emoji) button.setEmoji(b.emoji)
    return button
}

function buildDashboard() {
    const d = config.dashboard
    const c = withBanner(d)

    for (const block of d.blocks) c.addTextDisplayComponents(text(quote(block)))

    const buttons = d.buttons.map(buildButton)
    for (let i = 0; i < buttons.length; i += 5) {
        c.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)))
    }

    return v2(withFooter(c, d), { allowedMentions: { parse: [] } })
}

function buildPage(key) {
    const page = config.pages[key]
    if (!page) return null

    const c = withBanner(page)
    if (page.intro) c.addTextDisplayComponents(text(page.intro))

    for (const item of page.items ?? []) {
        c.addTextDisplayComponents(text(`**${item.emoji ? `${item.emoji} ` : ''}${item.title}**\n${quote(item.text)}`))
    }

    return {
        ...v2(withFooter(c, page), { allowedMentions: { parse: [] } }),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    }
}

module.exports = { buildDashboard, buildPage }