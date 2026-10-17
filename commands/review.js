const { SlashCommandBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js')

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
        ),

        async execute(interaction) {
            const designer = interaction.options.getUser('designer')
            const rating = interaction.options.getString('stars')
            const feedback = interaction.options.getString('feedback')

            const allowedRole = ''

            const channel = interaction.channels.cache.get('1555741897442467921')
        }
}