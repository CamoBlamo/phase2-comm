const { Message, Client } = require('discord.js')
const { buildPanel } = require('../tickets/messages')
const { isManager } = require('../tickets/util')

module.exports = {
    name: 'panel',
    description: 'posts a ticket panel: panel orders | panel support',

    /**
     * @param {Message} message
     * @param {string[]} args
     * @param {Client} client
    */
    async execute(message, args, client) {
        if (!message.inGuild()) return

        if (!isManager(message.member)) {
            return message.reply('You don\'t have permission to use this.')
        }

        const type = (args[0] || '').toLowerCase()
        if (!['orders', 'support'].includes(type)) {
            return message.reply(`Usage: \`${process.env.DISCORD_PREFIX}panel orders\` or \`${process.env.DISCORD_PREFIX}panel support\``)
        }

        await message.channel.send(buildPanel(type))
        await message.delete().catch(() => {})
    }
}