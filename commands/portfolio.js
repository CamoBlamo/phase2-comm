const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js')
const portfolio = require('../dashboard/portfolio')
const { canReview } = require('../dashboard/applications')
const config = require('../dashboard/config')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('portfolio')
        .setDescription('Manually create a designer portfolio thread')
        .setContexts(InteractionContextType.Guild)
        .addUserOption((o) => o.setName('user').setDescription('The designer').setRequired(true))
        .addStringOption((o) => o.setName('services').setDescription('What they design, e.g. Clothing, Liveries').setRequired(true).setMaxLength(200)),

    async execute(interaction) {
        // Anyone who can review one of the portfolio positions (or a manager)
        const allowed = config.applications.portfolio.positions.some((key) => canReview(interaction.member, key))
        if (!allowed) {
            return interaction.reply({ content: 'You can\'t create portfolios.', flags: MessageFlags.Ephemeral })
        }

        const user = interaction.options.getUser('user')
        if (user.bot) return interaction.reply({ content: 'Bots can\'t have portfolios.', flags: MessageFlags.Ephemeral })

        // Creating a forum thread can take a few seconds
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const result = await portfolio.create(interaction.guild, user.id, interaction.options.getString('services').trim())

        await interaction.editReply({
            content: result.error ? `Couldn't create it: ${result.error}` : `Portfolio created: <#${result.thread.id}>`,
            allowedMentions: { parse: [] },
        })
    },
}