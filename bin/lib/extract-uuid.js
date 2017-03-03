const isUUID = require('is-uuid');
const  debug = require('debug')('bin:lib:extract-uuid');

module.exports = function(str){

	let UUIDString = str;

	let uuidRegex = /([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})/i;
	let matchedUUID = uuidRegex.exec(UUIDString);

	UUIDString = matchedUUID ? matchedUUID[1] : null;

	debug("UUID:", UUIDString);

	if(!UUIDString || !isUUID.anyNonNil(UUIDString)){
		debug("Not a valid UUID in: " + str);
		return false;
	} else {
		return UUIDString;
	}
}
