const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js')
const config = require('./config')
const store = require('./store')
const {
    defs, typeDef, typeLabel, isManager, isStaffFor, canManage,
    ACCESS_EDIT, channelName, pad, log,
} = require('./util')
const { buildTicket, buildTerms, buildNotice } = require('./messages')

const busy = new Set()

async function refresh(channel, t) {
    if (!t.messageId) return
    const message = await channel.messages.fetch(t.messageId).catch(() => null)
    if (!message) return
    await message.edit({ ...buildTicket(t), allowedMentions: { parse: [] } }).catch((err) =>
        console.error('[Tickets] Failed to refresh ticket message:', err.message)
    )
}

function save(channel, t) {
    store.set(channel.id, t)
}

async function claim(channel, t, member) {
    if (busy.has(channel.id)) return { error: 'Hold on, this ticket is being updated.' }
    if (!isStaffFor(member, t)) return { error: 'You can\'t claim this ticket.' }
    if (t.claimerId) return { error: `This ticket is already claimed by <@${t.claimerId}>.` }
    if (t.kind === 'order' && config.orders.rules.requireTermsToClaim && config.orders.terms.enabled && !t.termsAcceptedAt) {
        return { error: 'The customer has to accept the Order Terms before this order can be claimed.' }
    }

    busy.add(channel.id)
    try {
        t.claimerId = member.id
        t.claimedAt = Date.now()
        save(channel, t)
        await refresh(channel, t)

        await channel.send(buildNotice(
            '🙋 Ticket Claimed',
            `<@${t.openerId}>, your ${t.kind === 'order' ? 'order' : 'ticket'} has been claimed by <@${member.id}>. They'll be assisting you from here.`,
            { users: [t.openerId] }
        ))
        await log(channel.client, '🙋 Ticket Claimed', [`${typeLabel(t)} #${pad(t.number)} · ${channel}`, `-# Claimed by <@${member.id}>`])
        return { ok: 'You claimed this ticket.' }
    } finally {
        busy.delete(channel.id)
    }
}

async function unclaim(channel, t, member) {
    if (!t.claimerId) return { error: 'This ticket isn\'t claimed.' }
    if (member.id !== t.claimerId && !isManager(member)) return { error: 'Only the claimer or a manager can unclaim this ticket.' }

    const previous = t.claimerId
    t.claimerId = null
    t.claimedAt = null
    save(channel, t)
    await refresh(channel, t)

    await channel.send(buildNotice('↩️ Ticket Unclaimed', `<@${previous}> is no longer handling this ticket. Another staff member can claim it.`))
    await log(channel.client, '↩️ Ticket Unclaimed', [`${typeLabel(t)} #${pad(t.number)} · ${channel}`, `-# By <@${member.id}>`])
    return { ok: 'Ticket unclaimed.' }
}

async function transfer(channel, t, member, target) {
    if (member.id !== t.claimerId && !isManager(member)) return { error: 'Only the claimer or a manager can transfer this ticket.' }
    if (!target) return { error: 'That user isn\'t in the server.' }
    if (target.user?.bot) return { error: 'You can\'t transfer a ticket to a bot.' }
    if (target.id === t.claimerId) return { error: 'They already have this ticket.' }
    if (!isStaffFor(target, t)) return { error: `<@${target.id}> isn't staff for ${typeLabel(t)}.` }

    const previous = t.claimerId
    t.claimerId = target.id
    t.claimedAt = Date.now()
    save(channel, t)
    await refresh(channel, t)

    await channel.send(buildNotice(
        '🔁 Ticket Transferred',
        `${previous ? `<@${previous}>` : 'This ticket'} → <@${target.id}>. <@${t.openerId}>, they'll be assisting you from here.`,
        { users: [target.id, t.openerId] }
    ))
    await log(channel.client, '🔁 Ticket Transferred', [`${typeLabel(t)} #${pad(t.number)} · ${channel}`, `-# To <@${target.id}> by <@${member.id}>`])
    return { ok: `Transferred to <@${target.id}>.` }
}

async function acceptTerms(channel, t, member) {
    if (member.id !== t.openerId) return { error: 'Only the customer who opened this order can accept the terms.' }
    if (t.termsAcceptedAt) return { error: 'The terms were already accepted.' }

    t.termsAcceptedAt = Date.now()
    save(channel, t)

    if (t.termsMessageId) {
        const message = await channel.messages.fetch(t.termsMessageId).catch(() => null)
        await message?.edit(buildTerms(t)).catch(() => {})
    }
    await refresh(channel, t)

    await log(channel.client, '📜 Terms Accepted', [`${typeLabel(t)} #${pad(t.number)} · ${channel}`, `-# By <@${member.id}>`])
    return { ok: 'Thanks! You accepted the Order Terms. A designer can now claim your order.' }
}

function moveMenu(t) {
    const options = Object.entries(defs(t.kind))
        .filter(([key]) => key !== t.type)
        .map(([key, d]) => {
            const o = new StringSelectMenuOptionBuilder().setLabel(d.label).setValue(key)
            if (d.description) o.setDescription(d.description.slice(0, 100))
            if (d.emoji) o.setEmoji(d.emoji)
            return o
        })

    if (!options.length) return null

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('tix:moveselect')
            .setPlaceholder(t.kind === 'order' ? 'Move this order to...' : 'Move this ticket to...')
            .addOptions(options)
    )
}

async function move(channel, t, member, newType) {
    if (!canManage(member, t)) return { error: 'You can\'t move this ticket.' }
    if (busy.has(channel.id)) return { error: 'Hold on, this ticket is being updated.' }

    const oldDef = typeDef(t)
    const newDef = defs(t.kind)[newType]
    if (!newDef) return { error: 'That option doesn\'t exist.' }
    if (newType === t.type) return { error: `It's already ${newDef.label}.` }

    busy.add(channel.id)
    try {
        const keep = new Set([...newDef.roleIds, ...config.MANAGER_ROLE_IDS])
        for (const id of oldDef?.roleIds ?? []) {
            if (!keep.has(id)) await channel.permissionOverwrites.delete(id).catch(() => {})
        }
        for (const id of newDef.roleIds) {
            await channel.permissionOverwrites.edit(id, ACCESS_EDIT).catch(() => {})
        }

        const opener = await channel.guild.members.fetch(t.openerId).catch(() => null)
        const name = opener
            ? channelName(newDef, opener, opener.user)
            : channel.name.replace(new RegExp(`^${oldDef?.channelPrefix}-`), `${newDef.channelPrefix}-`)

        await channel.edit({
            name,
            parent: newDef.parentId || channel.parentId,
            lockPermissions: false,
        }).catch((err) => console.error('[Tickets] Failed to move channel:', err.message))

        const fromLabel = oldDef?.label ?? t.type
        t.type = newType
        t.claimerId = null 
        t.claimedAt = null
        save(channel, t)
        await refresh(channel, t)

        const roleMentions = newDef.roleIds.map((id) => `<@&${id}>`).join(' ')
        await channel.send(buildNotice(
            '📦 Ticket Moved',
            `Moved from **${fromLabel}** to **${newDef.label}** by <@${member.id}>.${roleMentions ? `\n${roleMentions}` : ''}`,
            { roles: newDef.roleIds }
        ))
        await log(channel.client, '📦 Ticket Moved', [`#${pad(t.number)} · ${channel}`, `-# ${fromLabel} → ${newDef.label} by <@${member.id}>`])
        return { ok: `Moved to ${newDef.label}.` }
    } finally {
        busy.delete(channel.id)
    }
}

async function addUser(channel, t, member, target) {
    if (!canManage(member, t)) return { error: 'You can\'t add users to this ticket.' }
    if (!target) return { error: 'That user isn\'t in the server.' }
    if (target.id === t.openerId || t.addedUsers.includes(target.id)) return { error: 'They already have access.' }

    await channel.permissionOverwrites.edit(target.id, ACCESS_EDIT)
    t.addedUsers.push(target.id)
    save(channel, t)

    await channel.send(buildNotice('➕ User Added', `<@${target.id}> was added by <@${member.id}>.`, { users: [target.id] }))
    return { ok: `Added <@${target.id}>.` }
}

async function removeUser(channel, t, member, target) {
    if (!canManage(member, t)) return { error: 'You can\'t remove users from this ticket.' }
    if (!target) return { error: 'That user isn\'t in the server.' }
    if (target.id === t.openerId) return { error: 'You can\'t remove the person who opened the ticket.' }
    if (!t.addedUsers.includes(target.id)) return { error: 'They weren\'t added to this ticket.' }

    await channel.permissionOverwrites.delete(target.id)
    t.addedUsers = t.addedUsers.filter((id) => id !== target.id)
    save(channel, t)

    await channel.send(buildNotice('➖ User Removed', `<@${target.id}> was removed by <@${member.id}>.`))
    return { ok: `Removed <@${target.id}>.` }
}

async function rename(channel, t, member, name) {
    if (!canManage(member, t)) return { error: 'You can\'t rename this ticket.' }

    const clean = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 90)
    if (!clean) return { error: 'That name has no valid characters.' }

    try {
        await channel.setName(clean)
    } catch (err) {
        return { error: `Couldn't rename: ${err.message}` }
    }
    return { ok: `Renamed to #${clean}. (Discord allows 2 renames per 10 minutes.)` }
}

// ---------- Details ----------

async function setPriority(channel, t, member, priority) {
    if (!canManage(member, t)) return { error: 'You can\'t change this ticket\'s priority.' }
    const p = config.priorities[priority]
    if (!p) return { error: 'Unknown priority.' }

    t.priority = priority
    save(channel, t)
    await refresh(channel, t)

    await channel.send(buildNotice('🚩 Priority Updated', `Priority set to ${p.emoji} **${p.label}** by <@${member.id}>.`))
    return { ok: `Priority set to ${p.label}.` }
}

async function setQuote(channel, t, member, amount) {
    if (t.kind !== 'order') return { error: 'Prices can only be set on orders.' }
    if (!canManage(member, t)) return { error: 'You can\'t set the price on this order.' }

    t.quote = { amount: amount.slice(0, 100), by: member.id, at: Date.now() }
    save(channel, t)
    await refresh(channel, t)

    await channel.send(buildNotice(
        '💰 Price Set',
        `<@${t.openerId}>, the price for your order has been set to **${t.quote.amount}** by <@${member.id}>.`,
        { users: [t.openerId] }
    ))
    await log(channel.client, '💰 Price Set', [`${typeLabel(t)} #${pad(t.number)} · ${channel}`, `-# ${t.quote.amount} by <@${member.id}>`])
    return { ok: `Price set to ${t.quote.amount}.` }
}

async function setStatus(channel, t, member, status) {
    if (t.kind !== 'order') return { error: 'Status can only be set on orders.' }
    if (!canManage(member, t)) return { error: 'You can\'t change this order\'s status.' }
    const s = config.orders.statuses[status]
    if (!s) return { error: 'Unknown status.' }

    t.status = status
    save(channel, t)
    await refresh(channel, t)

    await channel.send(buildNotice(
        '📋 Status Updated',
        `<@${t.openerId}>, your order is now ${s.emoji} **${s.label}**.`,
        { users: [t.openerId] }
    ))
    return { ok: `Status set to ${s.label}.` }
}

module.exports = {
    refresh, claim, unclaim, transfer, acceptTerms,
    moveMenu, move, addUser, removeUser, rename,
    setPriority, setQuote, setStatus,
}