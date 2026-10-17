const { ChannelType, MessageFlags, ContainerBuilder } = require('discord.js')
const config = require('./config')
const store = require('./store')
const { text, separator, image } = require('./ui')

const cfg = config.applications.portfolio

function appliesTo(positionKey) {
    return Boolean(cfg?.enabled) && cfg.positions.includes(positionKey)
}

function servicesFrom(answers = []) {
    const want = cfg.servicesQuestion.toLowerCase().trim()
    const answer = answers.find((a) => a?.label?.toLowerCase().trim() === want)
    return answer?.value?.trim() || null
}

function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}

function buildPortfolio(userId, services) {
    const c = new ContainerBuilder()
    const top = cfg.imageUrl && cfg.imagePosition === 'top'
    const bottom = cfg.imageUrl && cfg.imagePosition !== 'top'

    if (top) c.addMediaGalleryComponents(image(cfg.imageUrl))

    c.addTextDisplayComponents(text(`## ${cfg.title}`))
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(text(
            `${fill(cfg.text, { mention: `<@${userId}>`, services: services ?? 'Not specified' })}\n\n` +
            `**Services**: ${services ?? 'Not specified'}`
        ))

    if (bottom) c.addMediaGalleryComponents(image(cfg.imageUrl))

    return {
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
    }
}

async function existing(guild, userId) {
    const threadId = store.load().portfolios?.[userId]
    if (!threadId) return null
    return guild.channels.fetch(threadId).catch(() => null)
}

async function create(guild, userId, services) {
    try {
        const already = await existing(guild, userId)
        if (already) return { error: `They already have a portfolio: <#${already.id}>.`, thread: already }

        const forum = cfg.FORUM_CHANNEL_ID && await guild.channels.fetch(cfg.FORUM_CHANNEL_ID).catch(() => null)
        if (!forum) return { error: 'The portfolio forum channel isn\'t set up (FORUM_CHANNEL_ID).' }
        if (forum.type !== ChannelType.GuildForum) return { error: 'FORUM_CHANNEL_ID isn\'t a forum channel.' }

        const member = await guild.members.fetch(userId).catch(() => null)
        const user = member?.user ?? await guild.client.users.fetch(userId).catch(() => null)
        if (!user) return { error: 'Couldn\'t find that user.' }

        const name = fill(cfg.threadTitle, {
            name: member?.displayName ?? user.username,
            mention: user.username,
            services: services ?? '',
        }).slice(0, 100)

        const thread = await forum.threads.create({
            name,
            message: buildPortfolio(userId, services),
            appliedTags: cfg.tagIds?.length ? cfg.tagIds.slice(0, 5) : undefined,
            reason: `Portfolio for ${user.tag}`,
        })

        await thread.members.add(userId).catch(() => {})
        await thread.send({
            content: fill(cfg.ping, { mention: `<@${userId}>`, name: member?.displayName ?? user.username, services: services ?? '' }),
            allowedMentions: { users: [userId] },
        })

        const data = store.load()
        data.portfolios = { ...(data.portfolios ?? {}), [userId]: thread.id }
        store.save(data)

        return { thread }
    } catch (err) {
        console.error('[Portfolio] Failed to create portfolio:', err)
        return { error: err.message.endsWith('.') ? err.message : `${err.message}.` }
    }
}

module.exports = { appliesTo, servicesFrom, create, buildPortfolio }