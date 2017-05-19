const debug = require('debug')('autovoice:individualUUIDs');
const extractUuid = require('./extract-uuid');

//------ keep a running list of unique individual article UUIDs -------//

let uuids = [];

function add( possibleUuid ) {
	const uuid = extractUuid( possibleUuid );
	let msg = "";

	if (uuid === false) {
		msg = "no valid UUID specified";
	} else if (uuids.includes(uuid)) {
		msg = "UUID already added";
	} else {
		uuids.push(uuid);
		msg = "UUID added";
	}

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
