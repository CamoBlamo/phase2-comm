const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('send a message as the bot')
    .addStringOption(option =>
        option.setName('message')
        .setDescription('the message you want to send as the bot')
        .setRequired(true)
    ),


    async execute(interaction) {

        const MOD_ROLE = ['1555741675085762672', '1555741671289921676']

        const messageToSay = interaction.options.getString('message');

        if (!interaction.member.roles.cache.hasAny(...MOD_ROLE)) {
            await interaction.reply({ 
                content: '<:Cross:1558367653544984770> You do not have permission to use this command.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.reply({ 
            content: 'Message sent!', 
            ephemeral: true 
        });


        await interaction.channel.send(messageToSay);
    }
}