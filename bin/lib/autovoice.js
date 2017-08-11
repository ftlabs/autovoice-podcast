const   md5 = require('md5');
const debug = require('debug')('bin:lib:autovoice');

const             extractUuid = require('./extract-uuid');
const            parseRSSFeed = require('./parse-rss-feed');
const                     tts = require('./get-tts');
const          dataItemsCache = require('./dataItemsCache');
const            constructRSS = require('./constructRSS');
const formatContentForReading = require('./formatContentForReading');
const            fetchContent = require('./fetchContent');
const         individualUUIDs = require('./individualUUIDs');
const         filterNullItems = require('./filter-null');

function processItemToMp3(item, voiceId){
	debug(`processItemToMp3: index=${item.processingIndex}, item.keys=${JSON.stringify(Object.keys(item))}, voiceId=${voiceId}`);

	// - establish if refers to an article with a valid uuid (return null if not)
	// - invoke the TTS service on the description text
	// - update the cache, mapping fileId to the itemData from the TTS service call
	// - return the item data, including audio url

	if (!item.uuid) {
		return null;
	} else {
		return Promise.resolve( item.uuid )
		.then(uuid => {
			const itemData = Object.assign({}, item);

			itemData.voiceId         = voiceId;
			itemData['is-human']     = false;
			itemData.format          = 'mp3';

			const contentForReading = formatContentForReading.wrapAndProcessItemData( itemData );
			itemData.contentForReading         = contentForReading;
			itemData.contentForReadingHashCode = md5(contentForReading);

			const fileIdWithoutDuration = [
					 'narrator-id=' + itemData.voiceId,
									'uuid=' + itemData.uuid,
							'is-human=' + itemData['is-human'],
								'format=' + itemData.format,
							'hashcode=' + itemData.contentForReadingHashCode,
				].join('&');

			itemData.fileIdWithoutDuration = fileIdWithoutDuration;

			const cachedItemDataWithMp3 = dataItemsCache.retrieve(fileIdWithoutDuration);
			if (cachedItemDataWithMp3) {
				debug('processItemToMp3: retrieved from cache: title=', itemData.title, ', voiceId=', itemData.voiceId);
				return cachedItemDataWithMp3;
			} else {
				debug('processItemToMp3: item not cached, so about to TTS, title=', itemData.title, ', voiceId=', itemData.voiceId);
			}

			return tts.mp3( itemData['contentForReading'], itemData.voiceId )
			.then( mp3Buffer => {

				let itemDataWithMp3 = Object.assign({}, itemData, {
					duration      : 60, // <-- NB this needs to be calculated. Will be checked/overridden by Absorber.
					mp3Buffer     : mp3Buffer
				});

				const fileId = [
					itemDataWithMp3.fileIdWithoutDuration,
					'duration=' + itemDataWithMp3.duration
					].join('&');

				itemDataWithMp3['fileId'] = fileId;

				debug(`processItemToMp3: post tts.mp3 item[${itemDataWithMp3.processingIndex}] mp3Buffer.length=${mp3Buffer.length}` );

				dataItemsCache.store(itemDataWithMp3);

				return itemDataWithMp3;
			});
		});
	}
}

function generatePodcast(rssUrl, voiceId=tts.defaultVoiceId){
	debug(`generatePodcast: rssUrl=${rssUrl}, voiceId=${voiceId}`);

	return Promise.all([
		fetchContent.rssItems(rssUrl),
		fetchContent.articlesAsItems( individualUUIDs.list() ),
	])
	.then( itemLists => [].concat.apply([], itemLists) ) // flatten the list of lists of items into a combined list of items
	.then( items => {
		debug(`generatePodcast: items.length=${items.length}`);
		const promises = items.map( (item, i) => {
			item.processingIndex = i;
			return processItemToMp3(item, voiceId)
				.catch(err => {
					debug(`An error occurred trying to generate speech for item ${item.uuid}. Err:`, err);
					return null;
				})
			;
		} );
		return Promise.all(promises);
	})
	.then( items => filterNullItems(items) )
	.then( items => {
		const feed = constructRSS(rssUrl, items);
		return feed;
	})
	;
}

function generateFirstFtBasedPodcast(maxResults, requestedUrl, includeFirstFtUuids, voiceId=tts.defaultVoiceId){
	debug(`generateFirstFtBasedPodcast: maxResults=${maxResults}, voiceId=${voiceId}`);

	return fetchContent.getLastFewFirstFtMentionedUuids(maxResults, includeFirstFtUuids)
	.then( firstFtBasedUuids => firstFtBasedUuids.concat(individualUUIDs.list()) )
	.then( uuids => fetchContent.articlesAsItems( uuids ) )
	.then( items => {
		debug(`generateFirstFtBasedPodcast: items.length=${items.length}`);
		const promises = items.map( (item, i) => {
			item.processingIndex = i;
			return processItemToMp3(item, voiceId)
				.catch(err => {
					debug(`An error occurred trying to generate speech for item ${item.uuid}. Err:`, err);
					return null;
				})
			;
		} );
		return Promise.all(promises);
	})
	.then( items => filterNullItems(items) )	
	.then( items => constructRSS(requestedUrl, items) )
	;
}

function generateListBasedPodcast(requestedUrl, voiceId=tts.defaultVoiceId){
	debug(`generateListBasedPodcast: voiceId=${voiceId}`);
	const defaultUUID = 'fb705712-3be7-11e7-821a-6027b8a20f23';

	return Promise.resolve( individualUUIDs.list() )
	.then( uuids => {
		debug(`generateListBasedPodcast: uuids.length=${uuids.length}`);
		if (uuids.length == 0) {
			debug(`generateListBasedPodcast: empty uuids list, so using defaultUUID=${defaultUUID}`);
			uuids = [defaultUUID];
		}
		return uuids;
	})
	.then( uuids => fetchContent.articlesAsItems( uuids ) )
	.then( items => {
		debug(`generateListBasedPodcast: items.length=${items.length}`);
		const promises = items.map( (item, i) => {
			item.processingIndex = i;
			return processItemToMp3(item, voiceId);
		} );
		return Promise.all(promises);
	})
	.then( items => constructRSS(requestedUrl, items) )
	;
}

function getMp3(fileId){
	const itemData = dataItemsCache.retrieve(fileId);
	if ( itemData ) {
			return Promise.resolve( itemData['mp3Buffer']);
	} else {
		return Promise.resolve( "no mp3 content for fileId=" + fileId );
	}
}

function getSnippetMp3(snippet, voiceId){
	debug('getSnippetMp3: snippet=', snippet, ', voiceId=', voiceId);

	const fileId = snippet + voiceId;
	const itemData = dataItemsCache.retrieve(fileId);
	if ( itemData ) {
			return Promise.resolve( itemData['mp3Buffer']);
	} else {
		const snippetForReading = formatContentForReading.processText( snippet );
		debug('getSnippetMp3: snippetForReading=', snippetForReading);

		return tts.mp3( snippetForReading, voiceId )
		.then( mp3Buffer => {

			let itemDataWithMp3 = {
				mp3Buffer     : mp3Buffer,
				voiceId       : voiceId,
				content       : snippet,
				contentForReading : snippetForReading,
				fileId        : fileId,
				fileIdWithoutDuration: fileId,
			};

			dataItemsCache.store(itemDataWithMp3);

			return itemDataWithMp3.mp3Buffer;
		})
		;
	}
}

module.exports = {
	podcast            : generatePodcast,
	mp3                : getMp3,
	snippetMp3         : getSnippetMp3,
	firstFtBasedPodcast: generateFirstFtBasedPodcast,
	listBasedPodcast   : generateListBasedPodcast,
};
