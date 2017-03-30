const fetch = require('node-fetch');
const md5   = require('md5');
const debug = require('debug')('autovoice:lib');

const             extractUuid = require('./extract-uuid');
const            parseRSSFeed = require('./parse-rss-feed');
const                     tts = require('./get-tts');
const          dataItemsCache = require('./dataItemsCache');
const            constructRSS = require('./constructRSS');
const formatContentForReading = require('./formatContentForReading');

function generatePodcast(rssUrl, voiceId=tts.defaultVoiceId){
	debug(`generatePodcast: rssUrl=${rssUrl}, voiceId=${voiceId}`);

	let isAlwaysNotHuman = true;

	{
		let match = /(\w+)-canBeHuman/i.exec(voiceId);
		if (match) {
			voiceId = match[1];
			isAlwaysNotHuman = false;
		}
	}

	// fetch the full rss feed
	// loop over each item
	// - establish if refers to an article with a valid uuid (return null if not)
	// - invoke the TTS service on the description text
	// - update the cache, mapping fileId to the itemData from the TTS service call
	// - return the item data, including audio url
	// Wait til all the processing is done
	// construct the new rss feed

	return fetch(rssUrl)
		.then(res  => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			debug('generatePodcast: feed=', feed);

			const promises = feed.channel[0].item.map((item, i)=> {
				const guid = item['guid'][0];
				debug('generatePodcast: rss item[', i, '] guid=', guid);

				const uuid = extractUuid( guid );

				if (!uuid) {
					return null;
				} else {
					return Promise.resolve( uuid )
						.then(uuid => {
							debug('generatePodcast: promise item[', i, '] uuid=', uuid);
							if(uuid === undefined){
								return false;
							}

							// Set is-human to be false except when the voiceId included -canBeHuman and it is the first item.
							// AKA, if the voiceId included -canBeHuman, set the first item to have is-human=true,
							// otherwise always set is-human=false.

							let isHuman = (isAlwaysNotHuman || i>0)? false : true;

							var itemData = {
								rssUrl  : rssUrl,
								content : item.description[0],
								voiceId : voiceId,
								title   : item.title[0],
								guid    : guid,
								pubdate : item.pubDate[0], // <-- NB this should be the now time,
						    author  : item.author[0],
								processingIndex : i,
								uuid            : uuid,
								'is-human'      : isHuman,
								format          : 'mp3',
							}

							let contentForReading = formatContentForReading.wrapAndProcessItemData( itemData );
							// if (i > 3) {
							// 	debug('generatePodcast: generatePodcast: setting contentForReading=""');
							// 	contentForReading = "";
							// }
							itemData['contentForReading']         = contentForReading;
							itemData['contentForReadingHashCode'] = md5(contentForReading);

							const fileIdWithoutDuration = [
									 'narrator-id=' + itemData.voiceId,
													'uuid=' + itemData.uuid,
											'is-human=' + itemData['is-human'],
												'format=' + itemData.format,
											'hashcode=' + itemData.contentForReadingHashCode,
								].join('&');

							itemData['fileIdWithoutDuration'] = fileIdWithoutDuration;

							const cachedItemDataWithMp3 = dataItemsCache.retrieve(fileIdWithoutDuration);
							if (cachedItemDataWithMp3) {
								debug('generatePodcast: retrieved from cache: title=', item.title[0], ', voiceId=', itemData.voiceId);
								return cachedItemDataWithMp3;
							} else {
								debug('generatePodcast: item not cached, so about to TTS, title=', item.title[0], ', voiceId=', itemData.voiceId);
							}

							return tts.mp3( itemData['contentForReading'], itemData.voiceId )
							.then( mp3Buffer => {

								let itemDataWithMp3 = Object.assign({}, itemData, {
									duration      : 60, // <-- NB this needs to be calculated
									mp3Buffer     : mp3Buffer
								});

								const fileId = [
									itemDataWithMp3.fileIdWithoutDuration,
									'duration=' + itemDataWithMp3.duration
									].join('&');

								itemDataWithMp3['fileId'] = fileId;

								debug('generatePodcast: post tts.mp3 item [ ' + itemDataWithMp3.processingIndex + ' ] mp3Buffer.length=' + mp3Buffer.length );

								dataItemsCache.store(itemDataWithMp3);

								return itemDataWithMp3;
							});
						});
					}
				})

			debug('num promises=', promises.length);

			return Promise.all(promises).then(items => {
				debug('in Promise.all');
				const feed = constructRSS(rssUrl, items);
				return feed;
			}, reason => {
				debug('in Promise.all rejecting:', reason)
			});

		})
		.catch(err => {
			debug(err);
		})
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
	podcast : generatePodcast,
	mp3     : getMp3,
	snippetMp3 : getSnippetMp3
};
