const { Message, Client, ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js')

module.exports = {
    name: 'ping',
    description: 'replies with pong and latency'

    /** 
     * @param {Message} message
     * @param {string[]} args
     * @param {Client} client
    */,
    async execute(message, args, client) {
        
        const sent = await message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Pinging...')
                    )
            ]
        });

        
        const roundTripLatency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        
        await sent.edit({
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
        });
    }
}