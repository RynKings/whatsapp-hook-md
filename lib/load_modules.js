const fs = require('fs')
var files = fs.readdirSync('./modules/');

const command_help = {}
const command_res = {}

String.prototype.code = function(){
	return "```" + this + "```"
}

String.prototype.bold = function(){
	return "*" + this + "*"
}

String.prototype.convertB64 = function(type) {
	if (type === 'base64'){
		return Buffer.from(this).toString('base64')
	} else {
		return Buffer.from(this, 'base64').toString()
	}
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

Array.prototype.remove = function(index){
	i = this.indexOf(index)
	if (i > -1) {
		this.splice(i, 1);
	}
	return this
}

function getHelp(){
	tmp_cmdhelp = {}
	for ([k,v] of Object.entries(command_res)){
		if (!tmp_cmdhelp.hasOwnProperty(v.filename)){
			tmp_cmdhelp[v.filename] = {}
		}
	}
	for ([k,v] of Object.entries(tmp_cmdhelp)){
		tmp_cmdres = {}
		for ([key, value] of Object.entries(command_res)){
			if (value.filename === k){
				tmp_cmdres[key] = value
			}
		}
		command_help[k] = tmp_cmdres
	}
}

const load = () => {
    console.log('PROTOTYPE LOADED!!!')

	files.forEach(file => {
		if (file.endsWith('.js')){
			i = require('../modules/' + file)
		}
	})

	getHelp();
}

exports.load = load;
exports.command_help = command_help;
exports.command_res = command_res;