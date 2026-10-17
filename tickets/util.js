const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js')
const config = require('./config')

const text = (content) => new TextDisplayBuilder().setContent(content)
const separator = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
const image = (url) => new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url))
const unix = (ms = Date.now()) => Math.floor(ms / 1000)
const pad = (n) => String(n).padStart(4, '0')
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const quote = (s) => s.split('\n').map((l) => `> ${l}`).join('\n')


function infoList(rows) {
    return rows.map(([label, value]) => `- **${label}:** ${String(value).replace(/\n/g, '\n  ')}`).join('\n')
}

function container(kind, overrides = {}) {
    const c = new ContainerBuilder()
    const banner = overrides.bannerUrl || config.images.bannerUrl
    if (config.display[kind]?.banner && banner) c.addMediaGalleryComponents(image(banner))
    return c
}

function finish(c, kind, overrides = {}) {
    const footer = overrides.footerImageUrl || config.images.footerImageUrl
    if (config.display[kind]?.footer && footer) {
        c.addSeparatorComponents(separator()).addMediaGalleryComponents(image(footer))
    }
    return c
}

const v2 = (c, extra = {}) => ({ components: [c], flags: MessageFlags.IsComponentsV2, ...extra })

function defs(kind) {
    return kind === 'order' ? config.orders.services : config.support.categories
}

function typeDef(ticket) {
    return defs(ticket.kind)[ticket.type] ?? null
}

function rules(kind) {
    return kind === 'order' ? config.orders.rules : config.support.rules
}

function typeLabel(ticket) {
    const def = typeDef(ticket)
    return def?.title ?? def?.label ?? ticket.type
}

function isManager(member) {
    if (!member) return false
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true
    return config.MANAGER_ROLE_IDS.length > 0 && member.roles.cache.hasAny(...config.MANAGER_ROLE_IDS)
}

function isStaffFor(member, ticket) {
    if (isManager(member)) return true
    const roleIds = typeDef(ticket)?.roleIds ?? []
    return roleIds.length > 0 && member.roles.cache.hasAny(...roleIds)
}

function canClose(member, ticket) {
    if (isManager(member)) return true
    const r = rules(ticket.kind)
    if (r.openerCanClose && member.id === ticket.openerId) return true
    if (ticket.claimerId) return member.id === ticket.claimerId
    return r.staffCanCloseUnclaimed && isStaffFor(member, ticket)
}

function canManage(member, ticket) {
    return member.id === ticket.claimerId || isStaffFor(member, ticket)
}

const ACCESS = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.SendMessagesInThreads,
]

const ACCESS_EDIT = {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
    SendMessagesInThreads: true,
}

function cleanName(n) {
    return (n || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}_-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function channelName(def, member, user) {
    const name = cleanName(member?.displayName) || cleanName(user?.username) || 'ticket'
    return [def.channelPrefix, name].filter(Boolean).join('-').slice(0, 90)
}

async function log(client, title, lines) {
    if (!config.LOG_CHANNEL_ID) return
    try {
        const channel = await client.channels.fetch(config.LOG_CHANNEL_ID)
        const c = container('log').addTextDisplayComponents(text(`**${title}**\n${lines.join('\n')}`))
        await channel.send(v2(finish(c, 'log'), { allowedMentions: { parse: [] } }))
    } catch (err) {
        console.error('[Tickets] Failed to log:', err.message)
    }
}

module.exports = {
    text, separator, image, unix, pad, truncate, quote, infoList,
    container, finish, v2,
    defs, typeDef, rules, typeLabel,
    isManager, isStaffFor, canClose, canManage,
    ACCESS, ACCESS_EDIT, channelName,
    log,
}