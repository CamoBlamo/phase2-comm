const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require('discord.js');

module.exports = {
    name: 'tax',
    description: 'Calculates how much to charge including a 30% tax (rounded)',

    /**
     * @param {import("discord.js").Message} message 
     * @param {string[]} args 
     * @param {import("discord.js").Client} client 
     */
    async execute(message, args, client) {
        const baseAmount = parseFloat(args[0]);

        if (isNaN(baseAmount) || baseAmount <= 0) {
            return message.reply("<:Cross:1558367653544984770> Please provide a valid numerical amount! Example: `-tax 100`").catch(console.error);
        }
        
        const TAX_PERCENT = 30;
        const decimalTax = TAX_PERCENT / 100;

        // Calculate raw amounts
        const rawTotal = baseAmount / (1 - decimalTax);
        
        // Round the total to the nearest whole integer
        const totalToCharge = Math.round(rawTotal);
        const taxAmount = totalToCharge - baseAmount;

        await message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## <:robux:1527748918924939456> Tax Calculation`),
                        new TextDisplayBuilder().setContent(`• **Base Amount:** \R$${baseAmount.toFixed(2)}`),
                        new TextDisplayBuilder().setContent(`• **Tax Cost (30%):** \R$${taxAmount.toFixed(2)}`),
                        new TextDisplayBuilder().setContent(`• **Total to Charge:** \R$\`${totalToCharge}\``)
                    )
            ]
        });
    }
};