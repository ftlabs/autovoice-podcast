const fetch = require('node-fetch');
const debug = require('debug')('autovoice:get-tts');
const fs    = require('fs');

const TTS_URL   = process.env.TTS_URL;
if (! TTS_URL ) {
	throw new Error('ERROR: TTS_URL not specified in env');
}

const TTS_TOKEN = process.env.TTS_TOKEN;
if( ! TTS_TOKEN) {
	throw new Error('ERROR: TTS_TOKEN not specified in env');
}

const voiceIdToName = {
	Geraint  : 'Geraint (Welsh English)',
	Gwyneth  : 'Gwyneth (Welsh)',
	Hans     : 'Hans (German)',
	Marlene  : 'Marlene (German)',
	Nicole   : 'Nicole (Australian)',
	Russell  : 'Russell (Australian)',
	Amy      : 'Amy (British)',
	Brian    : 'Brian (British)',
	Emma     : 'Emma (British)',
	Raveena  : 'Raveena (Indian English)',
	Ivy      : 'Ivy (US)',
	Joanna   : 'Joanna (US)',
	Joey     : 'Joey (US)',
	Justin   : 'Justin (US)',
	Kendra   : 'Kendra (US)',
	Kimberly : 'Kimberly (US)',
	Salli    : 'Salli (US)',
	Celine   : 'Celine (French)',
	Mathieu  : 'Mathieu (French)'
}

const britishVoiceIds = [
	'Geraint',
	'Gwyneth',
	'Amy',
	'Brian',
	'Emma',
];

const defaultVoiceId = 'Emma';
const defaultMp3File = 'static/audio/test.mp3';

function getMp3(content, voiceId){
	if (! voiceId ) {
		throw new Error('ERROR: no voiceId specified for getMp3');
	}

	if (! voiceIdToName.hasOwnProperty(voiceId) ) {
		throw new Error('ERROR: voiceId=' + voiceId + ' not recognised');
	}

	const voiceName = voiceIdToName[voiceId];

	// return the mp3 bytes as a buffer

	if (content) {
		const url = TTS_URL + '?token=' + TTS_TOKEN;
		const bodyObj = {
			content : content,
			voice   : voiceName
		};
		const bodyObjJson = JSON.stringify( bodyObj );

		debug('getMp3: url=' + url + "\nbody=" + bodyObjJson);

		return fetch(url, {
			method : 'POST',
			body   : bodyObjJson
		})
		.then( res => res.buffer() )
		;
	} else {
		return Promise.resolve( fs.readFileSync(defaultMp3File) );
	}
}

module.exports = {
	mp3          : getMp3,

	allVoicesIds : Object.keys(voiceIdToName),
	britishVoiceIds,
	defaultVoiceId
};
