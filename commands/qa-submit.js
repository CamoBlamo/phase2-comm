const { SlashCommandBuilder, ContainerBuilder, ButtonBuilder, ButtonStyle, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ChannelType, MessageFlags, ActionRowBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qc')
        .setDescription('submit a qa review request')
        .addChannelOption(opt =>
            opt
                .setName('order')
                .setDescription('channel for the order')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addUserOption(opt =>
            opt
                .setName('client')
                .setDescription('the client of the order')
                .setRequired(true)
        )
        .addStringOption(opt => 
            opt
                .setName('additional_details')
                .setDescription('anything else we should know')
                .setRequired(false)
        ),

        async execute(interaction) {
            const orderChannel = interaction.options.getChannel('order')
            const clientUser = interaction.options.getUser('client')
            const additionalInfo = interaction.options.getString('additional_details') ?? 'No additional details provided.'

            const allowedRoles = ['1555741721873350667', '1555741711010111640', '1555741703980458084', '1555741675085762672']

            const channel = interaction.guild.channels.cache.get('1555741941629587599')

            if (!interaction.member.roles.cache.hasAny(...allowedRoles)) {
                return interaction.reply({
                    content: `You don't have permission to run this command. Please contact a Executive if you believe this is an error.`,
                    flags: [MessageFlags.Ephemeral]
                })
            }

            const footer = new MediaGalleryBuilder()
                .addItems([{ media: { url: 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw' } }])

            const button = new ButtonBuilder()
                .setCustomId('qa-approve')
                .setEmoji('<:Checkmark:1558670921731149985>')
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success)

            const declineButton = new ButtonBuilder()
                .setCustomId('qa-decline')
                .setEmoji('<:Cross:1558367653544984770>')
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger)

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Quality Control: ${interaction.user.username}`),
                    new TextDisplayBuilder().setContent(`-# Submitted by: <@${interaction.user.id}>`),
                    new TextDisplayBuilder().setContent(`-# Ping: <@&1555741711010111640>`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('> A new quality assurance request has been submitted. View the designers work in the thread attached to this message.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Order Channel:**`),
                    new TextDisplayBuilder().setContent(`${orderChannel}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Client:**`),
                    new TextDisplayBuilder().setContent(`${clientUser}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Additional Information:**`),
                    new TextDisplayBuilder().setContent(`${additionalInfo}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(false)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(button)
                        .addComponents(declineButton)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addMediaGalleryComponents(footer)

                const message = await channel.send({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2]
                })

                const thread = await message.startThread({
                    name: `Quality Assurance: ${interaction.user.username}`,
                    autoArchiveDuration: 60,
                    reason: 'qa request'
                })

                await thread.send({
                    content: `<@${interaction.user.id}> - Attach your work here.`
                })

                return interaction.reply({
                    content: 'Successfully submitted',
                    flags: [MessageFlags.Ephemeral]
                })
        }
}