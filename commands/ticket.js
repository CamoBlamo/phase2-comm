const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js')
const config = require('../tickets/config')
const store = require('../tickets/store')
const { runAction } = require('../tickets/actions')

const moveChoices = [
    ...Object.entries(config.orders.services).map(([key, d]) => ({ name: `Order · ${d.label}`, value: `order:${key}` })),
    ...Object.entries(config.support.categories).map(([key, d]) => ({ name: `Support · ${d.label}`, value: `support:${key}` })),
].slice(0, 25)

const statusChoices = Object.entries(config.orders.statuses).map(([key, s]) => ({ name: s.label, value: key })).slice(0, 25)
const priorityChoices = Object.entries(config.priorities).map(([key, p]) => ({ name: p.label, value: key })).slice(0, 25)

const SUB_TO_ACTION = { 'close-request': 'closerequest' }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage this ticket')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((s) => s.setName('claim').setDescription('Claim this ticket'))
        .addSubcommand((s) => s.setName('unclaim').setDescription('Unclaim this ticket'))
        .addSubcommand((s) => s
            .setName('transfer').setDescription('Transfer this ticket to another staff member')
            .addUserOption((o) => o.setName('user').setDescription('Who to transfer it to').setRequired(true)))
        .addSubcommand((s) => s
            .setName('close').setDescription('Close this ticket now')
            .addStringOption((o) => o.setName('reason').setDescription('Why it\'s being closed').setMaxLength(500)))
        .addSubcommand((s) => s
            .setName('close-request').setDescription('Ask the opener to confirm closing this ticket')
            .addStringOption((o) => o.setName('reason').setDescription('Why it should be closed').setMaxLength(500)))
        .addSubcommand((s) => s
            .setName('add').setDescription('Add a user to this ticket')
            .addUserOption((o) => o.setName('user').setDescription('Who to add').setRequired(true)))
        .addSubcommand((s) => s
            .setName('remove').setDescription('Remove a user from this ticket')
            .addUserOption((o) => o.setName('user').setDescription('Who to remove').setRequired(true)))
        .addSubcommand((s) => s
            .setName('rename').setDescription('Rename this ticket channel')
            .addStringOption((o) => o.setName('name').setDescription('New channel name').setRequired(true).setMaxLength(90)))
        .addSubcommand((s) => s
            .setName('move').setDescription('Move this ticket to another service or category')
            .addStringOption((o) => o.setName('to').setDescription('Where to move it').setRequired(true).addChoices(...moveChoices)))
        .addSubcommand((s) => s
            .setName('priority').setDescription('Set this ticket\'s priority')
            .addStringOption((o) => o.setName('level').setDescription('Priority').setRequired(true).addChoices(...priorityChoices)))
        .addSubcommand((s) => s
            .setName('quote').setDescription('Set the price for this order')
            .addStringOption((o) => o.setName('amount').setDescription('e.g. 1,500 Robux or $20').setRequired(true).setMaxLength(100)))
        .addSubcommand((s) => s
            .setName('status').setDescription('Set this order\'s status')
            .addStringOption((o) => o.setName('status').setDescription('Status').setRequired(true).addChoices(...statusChoices))),

    async execute(interaction) {
        const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } })

        const channel = interaction.channel
        const t = store.get(channel.id)
        if (!t) return reply('Use this inside a ticket channel.')

        const sub = interaction.options.getSubcommand()
        const opt = interaction.options
        const action = SUB_TO_ACTION[sub] ?? sub

        if (action === 'move') await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const result = await runAction(action, {
            channel,
            t,
            member: interaction.member,
            user: interaction.user,
            target: opt.getMember('user'),
            text: opt.getString('reason') ?? opt.getString('name') ?? opt.getString('to') ??
                opt.getString('level') ?? opt.getString('amount') ?? opt.getString('status'),
        })

        const content = result.error ?? result.ok
        if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } })
        else await reply(content)

        if (result.after) await result.after()
    },
}