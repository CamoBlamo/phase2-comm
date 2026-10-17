const { Message, Client } = require('discord.js')
const { buildDashboard } = require('../dashboard/dashboard')
const { isManager } = require('../tickets/util')

module.exports = {
    name: 'dashboard',
    description: 'posts the dashboard in this channel',

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

        await message.channel.send(buildDashboard())
        await message.delete().catch(() => {})
    }
}