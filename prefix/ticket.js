const { Message, Client } = require('discord.js')
const store = require('../tickets/store')
const { ACTIONS, runAction } = require('../tickets/actions')

// Works two ways:
//   !ticket claim        !ticket close Order delivered
//   !claim               !close Order delivered        (shortcuts)
const SHORTCUTS = ['claim', 'unclaim', 'transfer', 'close', 'closerequest', 'close-request', 'add', 'remove', 'rename', 'move', 'priority', 'quote', 'price', 'status']

const ALIAS_TO_ACTION = { 'close-request': 'closerequest', price: 'quote' }

const USAGE = [
    '**Ticket commands**',
    '`claim` · `unclaim` · `transfer @user`',
    '`close [reason]` · `closerequest [reason]`',
    '`add @user` · `remove @user` · `rename <name>`',
    '`move <service/category>` · `priority <low/normal/high/urgent>`',
    '`quote <amount>` · `status <status>` (orders)',
].join('\n')

async function resolveMember(message, arg) {
    const id = arg?.match(/^<@!?(\d+)>$/)?.[1] ?? (/^\d{15,21}$/.test(arg ?? '') ? arg : null)
    if (!id) return null
    return message.guild.members.fetch(id).catch(() => null)
}

module.exports = {
    name: 'ticket',
    description: 'manage the ticket you run it in',
    aliases: ['t', ...SHORTCUTS],

    /**
     * @param {Message} message
     * @param {string[]} args
     * @param {Client} client
    */
    async execute(message, args, client) {
        if (!message.inGuild()) return

        const reply = (content) => message.reply({ content, allowedMentions: { parse: [] } })

        const used = message.content.slice(process.env.DISCORD_PREFIX.length).trim().split(/\s+/)[0].toLowerCase()
        let name = used
        if (used === 'ticket' || used === 't') {
            name = (args.shift() || '').toLowerCase()
            if (!name) return reply(USAGE)
        }
        const action = ALIAS_TO_ACTION[name] ?? name
        if (!ACTIONS.includes(action)) return reply(USAGE)

        const t = store.get(message.channel.id)
        if (!t) return reply('Use this inside a ticket channel.')

        const needsUser = ['transfer', 'add', 'remove'].includes(action)
        const target = needsUser ? await resolveMember(message, args[0]) : null
        if (needsUser && !args[0]) return reply(`Usage: \`${action} @user\``)

        const result = await runAction(action, {
            channel: message.channel,
            t,
            member: message.member,
            user: message.author,
            target,
            text: args.join(' ').trim() || null,
        })

        await reply(result.error ?? result.ok)
        if (result.after) await result.after()
    }
}