const { client, objectHook, publicListener } = require('../index');

hook = objectHook({pattern: 'test', example: '(cmd)', description: 'for testing'})
publicListener(hook, async (client, msg) => {
    client.c.sendMessage(msg.to, 'Hello Test')
})