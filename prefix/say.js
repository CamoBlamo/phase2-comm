module.exports = {
    name: 'say',
    description: 'make the bot send a message'

    /**
     * @param {import("discord.js").Message} message
     * @param {string[]}
     * @param {import("discord.js").Client}
     */,

     async execute(message, args, client) {

        const MOD_ROLE = ['1555741675085762672', '1555741671289921676']

        if (!message.member.roles.cache.hasAny(...MOD_ROLE)) {
            return message.reply("<:Cross:1558367653544984770> You do not have permission to use this command!").catch(console.error);
        }

        // 1. Join the args array together into a single string
        const messageToSay = args.join(" ");

        // 2. Check if the user actually typed a message after the command
        if (!messageToSay) {
            return message.reply("<:Cross:1558367653544984770> Please provide a message for me to repeat!").catch(console.error);
        }

        // 3. Optional: Delete the user's original command invocation message to keep the chat clean
        await message.delete().catch(() => null); 

        // 4. Send the message directly to the channel
        await message.channel.send(messageToSay);
    }
}