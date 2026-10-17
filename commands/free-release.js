const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('free-release')
        .setDescription('post a free release')
        .addUserOption(opt =>
            opt
                .setName('designer')
                .setDescription('who designed this')
                .setRequired(true)
        )
        .addAttachmentOption(opt => 
            opt
                .setName('free_release_file')
                .setDescription('the file you want to release for free. ZIP format')
                .setRequired(true)
        )
        .addAttachmentOption(opt => 
            opt
                .setName('preview_image')
                .setDescription('a preview of the free release')
                .setRequired(true)
        ),

        async execute(interaction) {
            const designerUser = interaction.options.getUser('designer')
            const file = interaction.options.getAttachment('free_release_file')
            const previewImage = interaction.options.getAttachment('preview_image')

            const channel = interaction.guild.channels.cache.get('1555741885836828682')

            const allowedRoles = ['1555741703980458084', '1555741675085762672', '1555741671289921676']

            if (!interaction.member.roles.cache.hasAny(...allowedRoles)) {
                return interaction.reply({
                    content: '<:Cross:1558367653544984770> You do not have permission to run this command.',
                    flags: [MessageFlags.Ephemeral]
                })
            }

            const footerImage = new MediaGalleryBuilder()
                .addItems([{ media: { url: 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw' } }])

            const bannerImage = new MediaGalleryBuilder()
                .addItems([{ media: { url: 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw' } }])

            const container = new ContainerBuilder()
                .addMediaGalleryComponents(bannerImage)
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# <@&1555741787073806376>')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(false)
                        .setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Check out our newest free release, this release is available for use by everyone. Download the file for unwatermarked access to this content.')

                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Designed By:** ${designerUser}`),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${file.url}`),
                    new TextDisplayBuilder().setContent(`${previewImage.url}`)
                )
                .addMediaGalleryComponents(footerImage)

            try {
            await channel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            })

            await interaction.reply({
                content: '<:Checkmark:1558670921731149985> Sucessfully sent free release.',
                flags: [MessageFlags.Ephemeral]
            })
        } catch {
            await interaction.reply({
                content: '<:Cross:1558367653544984770> Failed to run command.',
                flags: [MessageFlags.Ephemeral]
            })
        }
        }
}