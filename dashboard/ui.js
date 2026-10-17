const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js')
const config = require('./config')

const text = (content) => new TextDisplayBuilder().setContent(content)
const separator = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
const image = (url) => new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url))
const unix = (ms = Date.now()) => Math.floor(ms / 1000)
const quote = (s) => s.split('\n').map((l) => `> ${l}`).join('\n')
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '...' : s)

function withBanner(section = {}) {
    const c = new ContainerBuilder()
    const banner = section.bannerUrl || config.images.bannerUrl
    if (banner) c.addMediaGalleryComponents(image(banner)).addSeparatorComponents(separator())
    return c
}

function withFooter(c, section = {}) {
    const footer = section.footerImageUrl || config.images.footerImageUrl
    if (footer) c.addSeparatorComponents(separator()).addMediaGalleryComponents(image(footer))
    return c
}

const v2 = (c, extra = {}) => ({ components: [c], flags: MessageFlags.IsComponentsV2, ...extra })

module.exports = { text, separator, image, unix, quote, truncate, withBanner, withFooter, v2 }