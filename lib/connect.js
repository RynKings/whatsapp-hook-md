const fs = require('fs');
const qr = require('qrcode-terminal');
const { default: makeWASocket, BufferJSON, initInMemoryKeyStore, DisconnectReason } = require("@adiwajshing/baileys-md")

let client = undefined;

const loadState = () => {
    let state = undefined
    try {
        const value = JSON.parse(
            fs.readFileSync('./data/session.json', { encoding: 'utf-8' }),
            BufferJSON.reviver
        )
        state = {
            creds: value.creds,
            keys: initInMemoryKeyStore(value.keys)
        }
    } catch { }
    return state
}

const saveState = (state) => {
    state = state || sock?.authState
    fs.writeFileSync('./data/session.json', JSON.stringify(state, BufferJSON.replacer, 2), { encoding: 'utf-8' })
}

const startSock = () => {
    const sock = makeWASocket({
        auth: loadState(),
        printQRInTerminal: true,
    })
    return sock;
}

client = startSock();
client.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
        if((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
            sock = startSock()
        } else {
            console.log('connection closed')
        }
    }
    console.log('Connection Update', update)
})
client.ev.on('auth-state.update', (a) => saveState(a))

exports.client = client;