const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'data', 'tickets.json')
const REVIEW_TTL_MS = 14 * 24 * 60 * 60 * 1000

function load() {
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
        return { ounter: data.counter ?? 0, tickets: data.tickets ?? {}, reviews: data.reviews ?? {} }
    } catch {
        return { counter: 0, tickets: {}, reviews: {} }
    }
}

function save(data) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function nextNumber() {
    const data = load()
    data.counter++
    save(data)
    return data.counter
}

function get(channelId) {
    return load().tickets[channelId] ?? null
}

function all() {
    return Object.entries(load().tickets).map(([channelId, t]) => ({ channelId, ...t }))
}

function set(channelId, ticket) {
    const data = load()
    const { channelId: _, ...rest } = ticket
    data.tickets[channelId] = rest
    save(data)
}
 
function remove(channelId) {
    const data = load()
    delete data.tickets[channelId]
    save(data)
}

function addReview(number, info) {
    const data = load()
    const now = Date.now()
    for (const [n, r] of Object.entries(data.reviews)) {
        if (now - r.closedAt > REVIEW_TTL_MS) delete data.reviews[n]
    }
    data.reviews[number] = info,
    save(data)
}

function getReview(number) {
    return load().reviews[number] ?? null
}
 
function removeReview(number) {
    const data = load()
    delete data.reviews[number]
    save(data)
}

module.exports = { nextNumber, get, all, set, remove, addReview, getReview, removeReview }