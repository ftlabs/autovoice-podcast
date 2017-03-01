const fetch = require('node-fetch');
const debug = require('debug')('autovoice:get-tts');

const TTS_URL   = process.env.TTS_URL;
if (! TTS_URL ) {
	throw new Error('ERROR: TTS_URL not specified in env');
}

const TTS_TOKEN = process.env.TTS_TOKEN;
if( ! TTS_TOKEN) {
	throw new Error('ERROR: TTS_TOKEN not specified in env');
}

const allVoices = [
	'Geraint (Welsh English)',
	'Gwyneth (Welsh)',
	'Hans (German)',
	'Marlene (German)',
	'Nicole (Australian)',
	'Russell (Australian)',
	'Amy (British)',
	'Brian (British)',
	'Emma (British)',
	'Raveena (Indian English)',
	'Ivy (US)',
	'Joanna (US)',
	'Joey (US)',
	'Justin (US)',
	'Kendra (US)',
	'Kimberly (US)',
	'Salli (US)',
	'Celine (French)',
	'Mathieu (French)'
];

const britishVoices = [
	'Geraint (Welsh English)',
	'Gwyneth (Welsh)',
	'Amy (British)',
	'Brian (British)',
	'Emma (British)',
];

const defaultVoice = 'Emma (British)';

function getMp3(content, voice){

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

module.exports = {
	mp3 : getMp3,
	allVoices,
	britishVoices,
	defaultVoice
};
