const debug = require('debug')('autovoice:dataItemsCache');

/////////////////////////////////////////////////
//------ cache of Audio ItemData structs-------//

const cache = {}; // mapping fileIdWithoutDuration to itemData

function store( itemData ) {
	if( itemData && itemData.fileIdWithoutDuration ) {
		debug(`dataItemsCache.store: adding fileIdWithoutDuration=${itemData.fileIdWithoutDuration}`);
		cache[ itemData.fileIdWithoutDuration ] = itemData;
		return itemData.fileIdWithoutDuration;
	} else {
		debug('dataItemsCache.store: failed to add');
		return null;
	}
}

function retrieve( fileId ) {
	if (! fileId ) {
		debug('dataItemsCache.retrieve: failed: null fileId');
		return null;
	} else { // strip out duration=num, wherever it appears in the fileId
		const fileIdWithoutDuration = fileId
			.replace(/\bduration=\d+&?\b/, '')
			.replace(/&$/, '');

		debug(`retrieveAudioItemData: fileId=${fileId}, fileIdWithoutDuration=${fileIdWithoutDuration}`);

		if (! cache[fileIdWithoutDuration] ) {
			debug('dataItemsCache.retrieve: miss: no entry matching fileIdWithoutDuration=', fileIdWithoutDuration);
			return null;
		} else {
			debug('dataItemsCache.retrieve: hit: found entry matching fileIdWithoutDuration=', fileIdWithoutDuration);
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
