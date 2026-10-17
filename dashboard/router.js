const { MessageFlags } = require('discord.js')
const { buildPage } = require('./dashboard')
const applications = require('./applications')
const open = require('../tickets/open')

// customIds starting "dash:" (dashboard buttons) or "app:" (applications)
async function handleDashboardInteraction(interaction) {
    const [prefix, action, a, b] = interaction.customId.split(':')

    if (prefix === 'dash' && interaction.isButton()) {
        switch (action) {
            case 'page': {
                const page = buildPage(a)
                if (!page) return interaction.reply({ content: 'That page doesn\'t exist anymore.', flags: MessageFlags.Ephemeral })
                return interaction.reply(page)
            }
            case 'apply': return applications.openMenu(interaction)
            case 'ticket': return open.openFromButton(interaction, a, b)
        }
    }

    if (prefix === 'app') {
        if (interaction.isStringSelectMenu() && action === 'select') return applications.handleSelect(interaction)
        if (interaction.isModalSubmit() && action === 'form') return applications.handleFormSubmit(interaction, a, Number(b))

        if (interaction.isButton()) {
            if (action === 'next') return applications.handleNext(interaction, a)
            if (action === 'accept' || action === 'deny') return applications.handleDecisionButton(interaction, action, a, b)
        }

        if (interaction.isModalSubmit()) {
            if (action === 'acceptform') return applications.handleDecisionSubmit(interaction, 'accept', a, b)
            if (action === 'denyform') return applications.handleDecisionSubmit(interaction, 'deny', a, b)
        }
    }
}

module.exports = { handleDashboardInteraction }