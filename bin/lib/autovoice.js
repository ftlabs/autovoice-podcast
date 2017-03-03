const fetch = require('node-fetch');
const debug = require('debug')('autovoice:lib');

const             extractUuid = require('./extract-uuid');
const            parseRSSFeed = require('./parse-rss-feed');
const                     tts = require('./get-tts');
const          dataItemsCache = require('./dataItemsCache');
const            constructRSS = require('./constructRSS');
const formatContentForReading = require('./formatContentForReading');

function generatePodcast(rssUrl){
	debug('rssUrl=', rssUrl);

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
			debug('feed=', feed);

			const promises = feed.channel[0].item.map((item, i)=> {
				const guid = item['guid'][0];
				debug('rss item[', i, '] guid=', guid);

				const uuid = extractUuid( guid );

				if (!uuid) {
					return null;
				} else {
					return Promise.resolve( uuid )
						.then(uuid => {
							debug('promise item[', i, '] uuid=', uuid);
							if(uuid === undefined){
								return false;
							}

							var itemData = {
								rssUrl  : rssUrl,
								content : item.description[0],
								voiceId : tts.defaultVoiceId,
								title   : item.title[0],
								guid    : guid,
								pubdate : item.pubDate[0], // <-- NB this should be the now time,
						    author  : item.author[0],
								'narrator-id' : tts.defaultVoiceId,
								processingIndex : i,
								uuid            : uuid,
								'is-human'      : false,
								format          : 'mp3',
							}

							const fileIdWithoutDuration = 'audio_file.mp3?' + [
									 'narrator-id=' + itemData['narrator-id'],
													'uuid=' + itemData.uuid,
											'is-human=' + itemData['is-human'],
												'format=' + itemData.format
								].join('&');

								itemData['fileIdWithoutDuration'] = fileIdWithoutDuration;

							let contentForReading = formatContentForReading( itemData );
							if (i > 3) {
								debug('generatePodcast: setting contentForReading=""');
								contentForReading = "";
							}
							itemData['contentForReading'] = contentForReading;

							debug('about to TTS, title=', item.title[0], ', voiceId=', itemData.voiceId);

							return tts.mp3( itemData['contentForReading'], itemData['narrator-id'] )
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

module.exports = {
	podcast : generatePodcast,
	mp3     : getMp3
};
