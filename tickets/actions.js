// Shared by /ticket (slash) and the ticket prefix commands so both behave the same.
const config = require('./config')
const manage = require('./manage')
const close = require('./close')
const { defs } = require('./util')

const ACTIONS = ['claim', 'unclaim', 'transfer', 'close', 'closerequest', 'add', 'remove', 'rename', 'move', 'priority', 'quote', 'status']

// Match a config key or its label, case-insensitive ("in_progress", "In Progress", "in progress")
function findKey(map, input) {
    if (!input) return null
    const s = input.toLowerCase().trim()
    for (const [key, v] of Object.entries(map)) {
        if (key.toLowerCase() === s || key.toLowerCase().replace(/_/g, ' ') === s || v.label?.toLowerCase() === s) return key
    }
    return null
}

// "order:livery" (slash) or "livery" / "Livery" (prefix)
function resolveMove(t, to) {
    const [kind, type] = to.includes(':') ? to.split(':') : [null, to]
    const target = kind ?? t.kind

    if (target !== t.kind || !findKey(defs(t.kind), type)) {
        const otherKind = t.kind === 'order' ? 'support' : 'order'
        if (kind || findKey(defs(otherKind), type)) {
            return { error: `This is ${t.kind === 'order' ? 'an order' : 'a support ticket'}. It can only move to another ${t.kind === 'order' ? 'service' : 'support category'}.` }
        }
        const options = Object.values(defs(t.kind)).map((d) => d.label).join(', ')
        return { error: `Unknown option. Choose one of: ${options}` }
    }
    return { type: findKey(defs(t.kind), type) }
}

// ctx: { channel, t, member, user, target (member|null), text (string|null) }
// Returns { error } or { ok, after? }. Run `after` after replying (close deletes the channel).
async function runAction(action, { channel, t, member, user, target, text }) {
    switch (action) {
        case 'claim': return manage.claim(channel, t, member)
        case 'unclaim': return manage.unclaim(channel, t, member)
        case 'transfer': return manage.transfer(channel, t, member, target)
        case 'add': return manage.addUser(channel, t, member, target)
        case 'remove': return manage.removeUser(channel, t, member, target)

        case 'rename':
            if (!text) return { error: 'Give a new name.' }
            return manage.rename(channel, t, member, text)

        case 'quote':
            if (!text) return { error: 'Give an amount, e.g. 1,500 Robux.' }
            return manage.setQuote(channel, t, member, text)

        case 'priority': {
            const key = findKey(config.priorities, text)
            if (!key) return { error: `Choose a priority: ${Object.values(config.priorities).map((p) => p.label).join(', ')}` }
            return manage.setPriority(channel, t, member, key)
        }

        case 'status': {
            const key = findKey(config.orders.statuses, text)
            if (!key) return { error: `Choose a status: ${Object.values(config.orders.statuses).map((s) => s.label).join(', ')}` }
            return manage.setStatus(channel, t, member, key)
        }

        case 'move': {
            if (!text) return { error: 'Say where to move it.' }
            const resolved = resolveMove(t, text)
            if (resolved.error) return resolved
            return manage.move(channel, t, member, resolved.type)
        }

        case 'closerequest':
            return close.requestClose(channel, t, member, text)

        case 'close': {
            const error = close.closeError(member, t, channel.id)
            if (error) return { error }
            return { ok: 'Closing ticket...', after: () => close.performClose(channel, t, user, text || 'No reason given') }
        }
    }
    return { error: 'Unknown action.' }
}

module.exports = { ACTIONS, runAction }