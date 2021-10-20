const { client } = require('./lib/connect')
const { exec } = require('child_process')
const { load, command_help, command_res } =  require('./lib/load_modules')

const moment = require('moment-timezone')
const fs = require('fs')
const helper = require('./lib/client')

const parameters = []

var logs = false;
var logs_id = '';
var settings = undefined;
var owners = [];

var DATAPATH = './data/'

const loadJson = (path, default_dict = {}) => {
    if (!fs.existsSync(path)){
		fs.writeFileSync(path, JSON.stringify(default_dict))
	}
	return JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));
}
exports.loadJson = loadJson;

const saveJson = (dict, path) => {
    return fs.writeFileSync(path, JSON.stringify(dict, null, '\t'))
}
exports.saveJson = saveJson;

if (fs.existsSync(DATAPATH + 'settings.json')) {
    settings = loadJson(DATAPATH + 'settings.json');
    logs = settings.logs;
    logs_id = settings.logs_id;
    owners = settings.owners;
} else {
    settings = {
        logs: logs,
        logs_id: logs_id,
        owners: owners
    };
    saveJson(settings, DATAPATH + 'settings.json');
}

const printLogs = async (error) => {
    if (logs){
        if (logs_id == ''){
            console.log(error);
        } else {
            await client.sendMessage(logs_id, {text: String(error).code()});
        }
    } else {
        console.log(error);
    }
}
exports.printLogs = printLogs;

const osexec = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}
exports.osexec = osexec;

const getCallerFilePath = () => {
    child = process.mainModule.children;
    return child[child.length - 1].filename;
}

const processTime = (timestamp, now) => {
    return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}
exports.processTime = processTime;

const restart = () => {
    setTimeout(function () {
        process.on('exit', function () {
            require('child_process').spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached: true,
                stdio: 'inherit'
            })
        })
        process.exit()
    }, 2000)
}
exports.restart = restart

const objectHook = ({pattern = '', pattern_type = 'exact', buttonId = '', button_type = 'exact', chat_type = 'all', owners = false, example = '', description = '', waitListener = false } = {}) => {
    return {
        pattern: pattern,
        pattern_type: pattern_type,
        buttonId: buttonId,
        button_type: button_type,
        chat_type: chat_type,
        owners: owners,
        example: example,
        description: description,
        waitListener: waitListener
    }
}
exports.objectHook = objectHook;

const publicListener = (hook, callback) => {
    var filename = process.platform === 'linux' ? getCallerFilePath().split('/') : getCallerFilePath().split('\\');
    filename = filename[filename.length - 1].replace('.js','');

    var pattern = hook.pattern;
    var pattern_type = hook.pattern_type;
    var example = hook.example;
    var description = hook.description;
    var chat_type = hook.chat_type;
    var owners = hook.owners;

    if (typeof pattern !== 'string') {
        pattern.forEach(cmd => {
            let command_title = pattern_type === 'exact' ? cmd.trim() : cmd.split('\n')[0].split(' ')[0].trim();
            command_res[command_title] = {
                example: example.replace('(cmd)', cmd),
                description: description,
                chat_type: chat_type,
                pattern: cmd,
                pattern_type: pattern_type,
                func: callback,
                filename: filename,
            }
            parameters.push(
                {
                    func: callback,
                    pattern: cmd,
                    pattern_type: pattern_type,
                    chat_type: chat_type,
                    owners: owners,
                    list: false,
                    button: false
                }
            )
        })
    } else {
        let command_title = pattern_type === 'exact' ? pattern.trim() : pattern.split('\n')[0].split(' ')[0].trim();
        command_res[command_title] = {
            example: example.replace('(cmd)', pattern),
            description: description,
            chat_type: chat_type,
            pattern: pattern,
            pattern_type: pattern_type,
            func: callback,
            filename: filename,
        }
        parameters.push(
            {
                func: callback,
                pattern: pattern,
                pattern_type: pattern_type,
                chat_type: chat_type,
                owners: owners,
                list: false,
                button: false
            }
        )
    }
}
exports.publicListener = publicListener;

const buttonsMessageListener = (hook, callback) => {
    let buttonId = hook.buttonId;
    let chat_type = hook.chat_type;

    if (typeof buttonId !== 'string'){
        buttonId.forEach(cmd => {
            parameters.push(
                {
                    func: callback,
                    chat_type: chat_type,
                    list: false,
                    button: true,
                    buttonId: cmd,
                    button_type: hook.button_type
                }
            )
        })
    } else {
        parameters.push(
            {
                func: callback,
                chat_type: chat_type,
                list: false,
                button: true,
                buttonId: buttonId,
                button_type: hook.button_type
            }
        )
    }
}
exports.buttonsMessageListener = buttonsMessageListener;

const buttonCustomListener = (hook, callback) => {
    let params = {
        func: callback,
        list: false,
        button: true,
        buttonId: hook.buttonId,
        chat_type: hook.chat_type
    }
    parameters.push(params)
    return params
}
exports.buttonCustomListener = buttonCustomListener;

const listMessageListener = (callback) => {
    parameters.push(
        {
            func: callback,
            list: true
        }
    )
}
exports.listMessageListener = listMessageListener;

const publicAndButtonListener = (hook, callback) => {
    publicListener(hook, callback);
    buttonsMessageListener(hook, callback);
}
exports.publicAndButtonListener = publicAndButtonListener;

const anyListener = (hook, callback) => {
    let param = {
        func: callback,
        any: true,
        chat_type: hook.chat_type
    }
    parameters.push(param)
    return param
}
exports.anyListener = anyListener;

client.ev.on('messages.upsert', async m => {
    console.log(JSON.stringify(m, undefined, 2))
    if (!m.type === "notify") return
    const msg = client.c.serializeMessage(m.messages[0]);
    
    for (param of parameters){
        let chat_type = param.chat_type;
        let list = param.list;
        let buttonId = param.buttonId;
        let button_type = param.button_type;
        let any = param.any;
        let wait = param.wait;
        let func = param.func;
        let pattern = param.pattern;
        let pattern_type = param.pattern_type;

        if (chat_type === 'personal' && msg.isGroup) continue
        else if (chat_type === 'group' && !msg.isGroup) continue

        if (param.owners && !client.c.serializeNumberList(owners).includes(msg.sender)) continue

        try {
            if (any) await func(client, msg)
            
            if (msg.type === 'buttonsResponseMessage' && buttonId === msg.message.buttonsResponseMessage.selectedButtonId) await func(client, msg)

            if (typeof pattern === 'object'){
                var regex = new RegExp(pattern);
                var regs = regex.exec(msg.txt);
                if (regs){
                    regs = regex.exec(String(msg.text));
                    msg.pattern = regs;
                    await func(client, msg);
                }
            } else {
                msg.text = String(msg.text)
                msg.pattern = pattern
                switch(pattern_type){
                    case 'startswith':
                        if (msg.txt.startsWith(pattern)){
                            await func(client, msg)
                        }
                        break
                    case 'exact':
                        if (msg.txt === pattern){
                            await func(client, msg)
                        }
                        break
                }
            }

            if (msg.type === 'listResponseMessage' && list){
                msg.message.listResponseMessage.to = msg.to
				msg.message.listResponseMessage.sender = msg.sender
				msg.message.listResponseMessage.timestamp = msg.messageTimestamp
				msg.message.listResponseMessage.participant = msg.participant
				msg.message.listResponseMessage.isGroup = msg.isGroup

				msg.message.listResponseMessage.dataSelected = {}
				msg.message.listResponseMessage.dataSelected.label = msg.message.listResponseMessage.contextInfo.quotedMessage.listMessage.description
				var selectedRowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId
				try {
					var rowIdDecoded = JSON.parse(selectedRowId.convertB64('string'))
				} catch {
					var rowIdDecoded = selectedRowId.convertB64('string')
				}
				var sections = msg.message.listResponseMessage.contextInfo.quotedMessage.listMessage.sections
				for (section of sections){
					var num = 0
					for (row of section.rows){
						num += 1
						if (row.rowId === selectedRowId){
							msg.message.listResponseMessage.dataSelected.selectedRowId = num - 1
							msg.message.listResponseMessage.dataSelected.sectionSelected = section
							msg.message.listResponseMessage.dataSelected.rowIdDecoded = rowIdDecoded
							break
						}
					}
				}

				await func(client, msg.message)
            }
            

        } catch (error) {
			wa.sendMessage(msg.to, 'I am sorry there\'s bug on my system, please wait until my author fix it.')
			printLogs(error.stack);
		}
    }
})

exports.client = client;
exports.command_help = command_help;
exports.command_res = command_res;
exports.logs = logs;
exports.logs_id = logs_id;
exports.settings = settings;
exports.DATAPATH = DATAPATH;
exports.owners = owners;

load();