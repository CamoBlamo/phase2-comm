const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js')
const GROUP_ID = '748604955'
const BANNER_URL = 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw'
const DESCRIPTION_LIMIT = 150

module.exports = {
    name: 'group',
    aliases: [],

    async execute(message) {
        try {
            await message.channel.sendTyping()

            const [groupRes, iconRes] = await Promise.all([
                fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}`),
                fetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${GROUP_ID}&size=420x420&format=Png&isCircular=false`)
            ])

            if (!groupRes.ok) throw new Error(`Groups API returned ${groupRes.status}`)

            const group = await groupRes.json()
            const icon = iconRes.ok ? (await iconRes.json()).data?.[0]?.imageUrl : null

            const owner = group.owner
                ? `${group.owner.displayName} (@${group.owner.username})`
                : 'No owner.'

            const shout = group.shout?.body || 'No shout set.'

            const description = group.description
                ? group.description.length > DESCRIPTION_LIMIT
                    ? `${group.description.slice(0, DESCRIPTION_LIMIT).trimEnd()}...`
                    : group.description
                : 'No description provided.'

            const header = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${group.name}`),
                    new TextDisplayBuilder().setContent(
                        `**Owned by:** ${owner}\n**Members:** ${group.memberCount.toLocaleString()}\n**About:** "${shout}"`
                    )
                )

                if (icon) {
                    header.setThumbnailAccessory(new ThumbnailBuilder().setURL(icon))
                }

                const container = new ContainerBuilder()
                    .addSectionComponents(header)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(description)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel('View ROBLOX Group')
                                .setURL(`https://www.roblox.com/communities/${GROUP_ID}`)
                        )
                    )
                    .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(BANNER_URL)
                        )
                    )

                    await message.reply({
                        components: [container],
                        flags: [MessageFlags.IsComponentsV2],
                        allowedMentions: { repliedUser: false }
                    })
        } catch (err) {
            console.error(`Group Command Failed:`, err)
            await message.reply('Failed to fetch group info.').catch(() => {})
        }
    }
}