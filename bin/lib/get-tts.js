const fetch = require('node-fetch');
const debug = require('debug')('autovoice:get-tts');

const TTS_URL   = process.env.TTS_URL || throw new Error('ERROR: TTS_URL not specified in env');
const TTS_TOKEN = process.TTS_TOKEN   || throw new Error('ERROR: TTS_TOKEN not specified in env');

module.exports = function(content, voice){

	const url = TTS_URL + '?token=' + TOKEN;
	const bodyObj = {
		content : content,
		voice   : voice
	};

	// returns the mp3 bytes

	return fetch(url, {
		method : 'POST',
		body   : JSON.stringify( bodyObj )
	})
	;
}
