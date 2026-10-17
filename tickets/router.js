const { MessageFlags } = require('discord.js')
const store = require('./store')
const { canManage } = require('./util')
const open = require('./open')
const manage = require('./manage')
const close = require('./close')

const ephemeral = (interaction, content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } })

// Reply with the result of a manage.* action
function respond(interaction, result) {
    return ephemeral(interaction, result.error ?? result.ok)
}

// Everything with a customId starting "tix:"
async function handleTicketInteraction(interaction) {
    const [, action, a, b, c] = interaction.customId.split(':')

    // ---- Works outside ticket channels ----

    if (interaction.isStringSelectMenu() && action === 'select') return open.handleSelect(interaction, a)
    if (interaction.isModalSubmit() && action === 'open') return open.handleFormSubmit(interaction, a, b, c)
    if (interaction.isButton() && action === 'review') return close.handleReviewButton(interaction, a, b, c)
    if (interaction.isModalSubmit() && action === 'reviewform') return close.handleReviewSubmit(interaction, a, b, c)

    // ---- Inside a ticket ----

    const channel = interaction.channel
    const t = channel ? store.get(channel.id) : null
    if (!t) return ephemeral(interaction, 'This ticket no longer exists.')
    const member = interaction.member

    if (interaction.isButton()) {
        switch (action) {
            case 'claim': return respond(interaction, await manage.claim(channel, t, member))
            case 'unclaim': return respond(interaction, await manage.unclaim(channel, t, member))
            case 'terms': return respond(interaction, await manage.acceptTerms(channel, t, member))

            case 'close': {
                const error = close.closeError(member, t, channel.id)
                if (error) return ephemeral(interaction, error)
                return interaction.showModal(close.closeModal())
            }

            case 'changetype': {
                if (!canManage(member, t)) return ephemeral(interaction, 'You can\'t move this ticket.')
                const menu = manage.moveMenu(t)
                if (!menu) return ephemeral(interaction, 'There\'s nowhere else to move this ticket.')
                return interaction.reply({ components: [menu], flags: MessageFlags.Ephemeral })
            }

            case 'creq': return close.answerCloseRequest(interaction, channel, t, a === 'yes')
        }
    }

    if (interaction.isStringSelectMenu() && action === 'moveselect') {
        await interaction.deferUpdate()
        const result = await manage.move(channel, t, member, interaction.values[0])
        return interaction.editReply({ content: result.error ?? result.ok, components: [] })
    }

    if (interaction.isModalSubmit() && action === 'closeform') {
        const error = close.closeError(member, t, channel.id) // re-check, things may have changed
        if (error) return ephemeral(interaction, error)

        const reason = interaction.fields.getTextInputValue('reason').trim() || 'No reason given'
        await ephemeral(interaction, 'Closing ticket...')
        return close.performClose(channel, t, interaction.user, reason)
    }
}

// Timers: auto-close expired close requests
function initTickets(client) {
    client.once('clientReady', () => {
        close.checkCloseRequests(client).catch((err) => console.error('[Tickets] Close request check failed:', err))
        setInterval(() => {
            close.checkCloseRequests(client).catch((err) => console.error('[Tickets] Close request check failed:', err))
        }, 60_000)
    })
}

module.exports = { handleTicketInteraction, initTickets }