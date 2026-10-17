const { Message, Client } = require('discord.js')
const { isManager } = require('../tickets/util')
const applications = require('../dashboard/applications')

module.exports = {
    name: 'apps',
    description: 'manage applications: apps | apps open <position> | apps close <position> | apps reset @user <position>',
    aliases: ['applications'],

    /**
     * @param {Message} message
     * @param {string[]} args
     * @param {Client} client
    */
    async execute(message, args, client) {
        if (!message.inGuild()) return

        const reply = (content) => message.reply({ content, allowedMentions: { parse: [] } })
        if (!isManager(message.member)) return reply('You don\'t have permission to use this.')

        const p = process.env.DISCORD_PREFIX
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'open' || sub === 'close') {
            const key = (args[1] || '').toLowerCase()
            const pos = applications.position(key)
            if (!pos) return reply(`Unknown position. Use one of the keys from \`${p}apps\`.`)

            applications.setOpen(key, sub === 'open')
            return reply(`${sub === 'open' ? '🟢' : '🔴'} ${pos.label} applications are now **${sub === 'open' ? 'open' : 'closed'}**.`)
        }

        if (sub === 'reset') {
            const id = args[1]?.match(/^<@!?(\d+)>$/)?.[1] ?? (/^\d{15,21}$/.test(args[1] ?? '') ? args[1] : null)
            const key = (args[2] || '').toLowerCase()
            if (!id || !applications.position(key)) return reply(`Usage: \`${p}apps reset @user <position>\``)

            const had = applications.resetUser(id, key)
            return reply(had
                ? `Cleared <@${id}>'s pending application and cooldown for ${applications.position(key).label}. They can apply again.`
                : `<@${id}> had no pending application or cooldown for ${applications.position(key).label}.`)
        }

        return reply([
            '**Applications**',
            ...applications.summary(),
            '',
            `\`${p}apps open <position>\` · \`${p}apps close <position>\` · \`${p}apps reset @user <position>\``,
        ].join('\n'))
    }
}