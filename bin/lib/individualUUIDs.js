const debug = require('debug')('autovoice:individualUUIDs');
const extractUuid = require('./extract-uuid');

//------ keep a running list of unique individual article UUIDs -------//

let uuids = [];

function add( possibleUuids ) {
	let msg = '';

	possibleUuids.split(',').forEach(possibleUuid => {
		const uuid = extractUuid( possibleUuid );

		if (uuid === false) {
			msg += `invalid UUID - ${possibleUuid}`;
		} else if (uuids.includes(uuid)) {
			msg += `UUID already added - ${uuid}`;
		} else {
			uuids.push(uuid);
			msg += `UUID added - ${uuid}`;
		}

		msg += '<br>';
	});

	return msg;
}

function clear() {
	const num = uuids.length;
	uuids = [];
	return `cleared ${num} UUIDs`;
}

function list() {
	return uuids.slice(0);
}

module.exports = {
	add,
	clear,
	list
};
