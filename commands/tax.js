const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tax')
        .setDescription('view the amount to charge based on price')
        .addNumberOption(opt => 
            opt
                .setName('amount')
                .setDescription('the base amount wanted to receive')
                .setRequired(true)
        ),

        async execute(interaction) {
            const baseAmount = interaction.options.getNumber('amount')

            const TAX_PERCENT = 30
            const decimalTax = TAX_PERCENT / 100

            const rawTotal = baseAmount / (1 - decimalTax)

            const totalToCharge = Math.round(rawTotal)
            const taxAmount = totalToCharge - baseAmount

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**<:Robux:1558364180862468166> Tax Calculation**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Large)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**<:Dot:1558362962304041000> Base Amount:** \R$${baseAmount.toFixed(2)}`),
                    new TextDisplayBuilder().setContent(`**<:Dot:1558362962304041000> Tax Cost (30%):** \R$${taxAmount.toFixed(2)}`),
                    new TextDisplayBuilder().setContent(`**<:Dot:1558362962304041000> Amount to charge:** \R$\`${totalToCharge}\``)
                )

            await interaction.reply({
                components: [container],
                flags: [MessageFlags.IsComponentsV2]
            })
        }
}