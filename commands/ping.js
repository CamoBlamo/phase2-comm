const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('respond with pong and latency'),

        async execute(interaction) {
            const sent = await interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('**Pinging...**')
                        )
                ],
                fetchReply: true
            })

            const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp
            const apiLatency = Math.round(interaction.client.ws.ping)

            await interaction.editReply({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Pong**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`<:Dot:1558362962304041000> **Bot Latency:** ${roundTripLatency}ms`),
                        new TextDisplayBuilder().setContent(`<:Dot:1558362962304041000> **API Latency:** ${apiLatency}ms`)
                )
            ]
        })
        }
}