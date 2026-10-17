const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'data', 'dashboard.json')

function load() {
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
        return { open: data.open ?? {}, pending: data.pending ?? {}, cooldowns: data.cooldowns ?? {} }
    } catch {
        return { open: {}, pending: {}, cooldowns: {} }
    }
}

function save(data) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

const key = (userId, position) => `${userId}:${position}`

module.exports = { load, save, key }