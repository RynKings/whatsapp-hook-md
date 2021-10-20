const { client } = require('./connect')

const fs = require('fs');

client.c = {}

client.c.dictIsEmpty = (dict) => {
    if (dict === null) return true;
    return Object.keys(dict).length === 0;
}

client.c.getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

client.c.normalizeMention = (text, mentions) => {
    if(! mentions.length > 0){
        return text
    }
    if(text.includes("@!")){
        const texts = text.split('@!')
        let textx = ''
        if(texts.length -1 !== mentions.length){
            return  texts
        }
        for(i of mentions){
            textx += texts[mentions.indexOf(i)]
            textx += "@"+i.replace("@s.whatsapp.net", "")
        }
        textx += texts[mentions.length]
        return textx
    } else {
        return text
    }
}

client.c.serializeMessage = (m) => {
    m.source = m
    try {
        m.message = m.message.ephemeralMessage ? m.message.ephemeralMessage.message : m.message
    } catch {
        m.message = m.message
    }
    m.isGroup = m.key.remoteJid.endsWith("@g.us")
    try {
        m.type = Object.keys(m.message)[0]
    } catch {
        m.type = null
    }
    try {
        m.quoted = m.message.extendedTextMessage.contextInfo.quotedMessage
    } catch {
        m.quoted = null
    }
    try {
        m.mentionedJid = m.message[m.type].contextInfo.mentionedJid
    } catch {
        m.mentionedJid = null
    }
    m.sender = m.isGroup ? m.participant : m.key.fromMe ? client.c.user.jid : m.key.remoteJid
    m.text = m.type === 'conversation' && m.message.conversation ? m.message.conversation : m.type === 'imageMessage' && m.message.imageMessage.caption ? m.message.imageMessage.caption : m.type === 'videoMessage' && m.message.videoMessage.caption ? m.message.videoMessage.caption : m.type === 'extendedTextMessage' && m.message.extendedTextMessage.text ? m.message.extendedTextMessage.text : ''
    m.txt = String(m.text).toLowerCase()
    m.to = m.key.remoteJid
    return m
}

client.c.serializeNumberList = (list) => {
    let result = []
    list.forEach(number => {
        result.push(client.c.serializeNumber(number))
    })
    return result
}

client.c.serializeNumber = (number) => {
    return client.c.normalizeNumber(number) + '@s.whatsapp.net'
}

client.c.normalizeNumber = (jid) => {
    return jid.replace("@s.whatsapp.net", "")
}

client.c.sendListMessage = async (id, button = {}, sections = []) => {
    tmp_sections = []
    for (sec_data of sections){
        tmp_rows = []
        for (row_data of sec_data.rows){
            if (typeof row_data.rowId == 'object') row_data.rowId = JSON.stringify(row_data.rowId)
            row_data.rowId = row_data.rowId.convertB64('base64')
            tmp_rows.push({title: row_data.title, description: row_data.description, rowId: row_data.rowId})
        }
        tmp_sections.push({title: sec_data.title, rows: tmp_rows})
    }
    m = {
        buttonText: button.buttonText,
        description: button.description,
        sections: tmp_sections,
        listType: 1
    }
    return await client.c.sendMessage(id, {list: m})
}

client.c.sendButton = async (id, {content = '', footer = 'Mars 11', buttons = [], title = ''} = {}, media = {}, options) => {
    let message = {
        contentText: content,
        footerText: footer,
        buttons: buttons,
        headerType: 1,
    }
    if (content.includes("@!")){
        message.contentText = client.c.normalizeMention(content, options.mids)
        options = {contextInfo: {mentionedJid: options.mids}}
    }
    if (title !== ''){
        message.text = title
        message.headerType = 2
    }
    if (!dictIsEmpty(media)){
        let headerDict = {
            imageMessage: 4,
            documentMessage: 3,
            videoMessage: 5,
            locationMessage: 6
        }
        if (media.url){
            var m = await client.c.prepareMessage(id, {url: media.url}, media.type)
        } else {
            var m = await client.c.prepareMessage(id, fs.readFileSync(media.path), media.type)
        }
        m.message = m.message.ephemeralMessage ? m.message.ephemeralMessage.message : m.message
        message[media.type] = m.message[media.type]
        message.headerType = headerDict[media.type]
    }
    return await client.c.sendMessage(id, {button: message}, options)
}

client.c.getName = (msg) => {
    user = typeof msg === 'object' ? client.contacts[msg.sender] : client.contacts[msg]
    if (!user){
        let sender = typeof msg === 'object' ? msg.sender : msg
        return sender.replace('@s.whatsapp.net','')
    } else if (user.notify){
        return user.notify
    } else if (user.name){
        return user.name
    } else if (user.short){
        return user.short
    } else if (user.jid){
        return user.jid.replace('@s.whatsapp.net','')
    }
    return ''
}

client.c.sendMessage = async (id, text) => {
    return await client.sendMessage(id, {text: text})
}

client.c.sendReply = async (id, text, msg) => {
    return await client.sendMessage(id, {text: text}, {quoted: msg})
}

client.c.sendImage = async (id, path, caption = '') => {
    return await client.sendMessage(id, {image: {url: path}, caption: caption})
}

client.c.sendVideo = async (id, path, caption = '') => {
    return await client.sendMessage(id, {video: {url: path}, caption: caption})
}

client.c.sendVoice = async (id, path) => {
    return await client.sendMessage(id, {audio: {url: path}, mimetype: 'audio/mp4', ptt: true})
}

client.c.sendContact = async (id, wid, name) => {
    return await client.sendMessage(id, {contacts:  {
        displayName: name,
        vcard: 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:Kontak\n' + 'TEL;type=CELL;type=VOICE;waid=' + wid.split("@s.whatsapp.net")[0] + ':+' + wid.split("@s.whatsapp.net")[0] + '\n' + 'END:VCARD'
    }})
}

client.c.sendMention = async (id, text, mids) => {
    let message = client.c.normalizeMention(text, mids)
    return await client.sendMessage(id, {text: message, contextInfo: {"mentionedJid": mids}})
}

client.c.sendSticker = async (id, path) => {
    return await client.sendMessage(id, {sticker: {url: path}})
}

client.c.getGroup = async (id) => {
    return await client.groupMetadata(id)
}

client.c.getParticipantIds = async (id) => {
    let group = await client.c.getGroup(id)
    return group.participants.map(p => p.jid)
}

client.c.getAdminIds = async (id) => {
    let group = await client.c.getGroup(id)
    return group.participants.filter(p => p.isAdmin).map(p => p.jid)
}

client.c.getOwnerIds = async (id) => {
    let group = await client.c.getGroup(id)
    return group.participants.filter(p => p.isSuperAdmin).map(p => p.jid)
}

client.c.getGroups = async () => {
    let all_chat = await client.chats.all()
    return all_chat.map(gid => gid.jid).filter(gid => gid.includes('@g.us'))
}

client.c.getGroupInvitationUrl = async (id) => {
    let ginvitecode = await client.groupInviteCode(id)
    let link = 'https://chat.whatsapp.com/' + ginvitecode
    return link
}

client.c.getGroupInvitationCode = async (id) => {
    return await client.groupInviteCode(id)
}

client.c.getContact = async (id) => {
    return await client.contacts[id]
}

client.c.getPicture = async (id) => {
    await client.profilePictureUrl(id)
}

client.c.getBio = async (id) => {
    return client.fetchStatus(id)
}

client.c.hideTag = async (id, text) => {
    let group = await client.c.getGroup(id)
    let members = group.participants.map(p => jid)
    return await client.sendMessage(id, {text: text, contextInfo: {"mentionedJid": members}})
}

client.c.fakeReply = async (id, target, text, target_text, mention = []) => {
    return await client.sendMessage(id, {
        text: text,
        contextInfo: {
            mentionedJid: mention,
            stanzaId: 'B826873620DD5947E683E3ABE663F263',
            participant: target,
            quotedMessage: {
                conversation: target_text
            }
        }
    })
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}
exports.sleep = sleep