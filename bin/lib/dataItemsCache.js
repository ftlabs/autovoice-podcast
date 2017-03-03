const debug = require('debug')('autovoice:dataItemsCache');

/////////////////////////////////////////////////
//------ cache of Audio ItemData structs-------//

const cache = {}; // mapping fileIdWithoutDuration to itemData

function store( itemData ) {
	if( itemData && itemData.fileIdWithoutDuration ) {
		cache[ itemData.fileIdWithoutDuration ] = itemData;
		return itemData.fileIdWithoutDuration;
	} else {
		return null;
	}
}

function retrieve( fileId ) {
	if (! fileId ) {
		return null;
	} else { // strip out duration=num, wherever it appears in the fileId
		const fileIdWithoutDuration = fileId
			.replace(/\bduration=\d+&?\b/, '')
			.replace(/&$/, '');

		debug(`retrieveAudioItemData: fileId=${fileId}, fileIdWithoutDuration=${fileIdWithoutDuration}`);

		if (! cache[fileIdWithoutDuration] ) {
			return null;
		} else {
			return cache[fileIdWithoutDuration];
		}
	}
}

function keys() {
	return Object.keys(cache);
}

module.exports = {
	store,
	retrieve,
	keys
};
