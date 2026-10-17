const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js')

const STAR = '<:Star:1475265205960179825>'
const REVIEW_CHANNEL_ID = '1555741897442467921'
const ALLOWED_ROLE_ID = ''
const BANNER_URL = ''
const FOOTER_URL = 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('leave a review for a designer')
        .addUserOption(opt =>
            opt
                .setName('designer')
                .setDescription('who completed the order')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt
                .setName('stars')
                .setDescription('the rating to give')
                .setRequired(true)
                .setChoices(
                    { name: '1 - Improvement Needed', value: '1' },
                    { name: '2 - Below Expectations', value: '2' },
                    { name: '3 - Satisfactory', value: '3' },
                    { name: '4 - Above Satisfactory', value: '4' },
                    { name: '5 - Outstanding', value: '5' }
                )
        )
        .addStringOption(opt =>
            opt
                .setName('feedback')
                .setDescription('feedback you have for the designer')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction) {
        const designer = interaction.options.getUser('designer')
        const rating = parseInt(interaction.options.getString('stars'), 10)
        const feedback = interaction.options.getString('feedback')

        if (ALLOWED_ROLE_ID && !interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ content: 'You don\'t have permission to leave reviews.', flags: MessageFlags.Ephemeral })
        }

        if (designer.id === interaction.user.id) {
            return interaction.reply({ content: 'You can\'t review yourself.', flags: MessageFlags.Ephemeral })
        }

        if (designer.bot) {
            return interaction.reply({ content: 'You can\'t review a bot.', flags: MessageFlags.Ephemeral })
        }

        const channel = interaction.client.channels.cache.get(REVIEW_CHANNEL_ID)
            ?? await interaction.client.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null)

        if (!channel) {
            return interaction.reply({ content: 'Review channel not found.', flags: MessageFlags.Ephemeral })
        }

        const stars = STAR.repeat(rating)

        const container = new ContainerBuilder()

        if (BANNER_URL) {
            container
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(BANNER_URL)
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
                )
        }

        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## New Review'),
                new TextDisplayBuilder().setContent(
                    `**Review for:** ${designer}\n` +
                    `**Rating:** ${stars}\n` +
                    `**Submitted by:** ${interaction.user}\n` +
                    `**Reason:** ${feedback}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(FOOTER_URL)
                )
            )

        try {
            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [designer.id] }
            })
        } catch (err) {
            console.error(err)
            return interaction.reply({ content: 'Failed to post the review.', flags: MessageFlags.Ephemeral })
        }

        await interaction.reply({ content: `Review posted in ${channel}.`, flags: MessageFlags.Ephemeral })
    }
}