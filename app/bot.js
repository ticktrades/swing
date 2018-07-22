
const Slimbot = require('slimbot');
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN);

function broadcast(message) {
	return slimbot
		.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
			parse_mode: 'HTML'
		})
		.then(m => {
			console.log(m);
		})
		.catch(error => {
			throw new Error(error);
		});
}

module.exports = broadcast;