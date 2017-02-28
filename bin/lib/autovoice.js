const fs = require('fs');
const fetch = require('node-fetch');
const debug = require('debug')('autovoice:lib');

const extractUuid = require('./extract-uuid');
const parseRSSFeed = require('./parse-rss-feed');

function generatePodcast(rssUrl){
	debug('rssUrl=', rssUrl);

	// fetch the full rss feed
	// loop over each item
	// - establish if refers to an article with a valid uuid (return null if not)
	// - invoke the TTS service on the description text
	// - cache the mp3 and/or create a map of audio url name to the TTS service call
	// - return the item data, including audio url
	// Wait til all the processing is done
	// construct the new rss feed

	return fetch(rssUrl)
		.then(res  => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			debug('feed=', feed);

			const P = feed.channel[0].item.map((item, i)=> {
				const guid = item['guid'][0];
				debug('item[', i, '] guid=', guid);

				const uuid = extractUuid( guid );

				if (!uuid) {
					return null;
				} else {
					return Promise.resolve( uuid )
						.then(uuid => {
							debug('item[', i, '] uuid=', uuid);
							if(uuid === undefined){
								return false;
							}

							debug('pretending to TTS, title=', item.title[0]);

							const description = item.description[0];

							return {
								original : {
									title   : item.title[0],
									guid    : guid,
								  pubdate : item.pubDate[0], // NB this should be the now time
								},
								tts : {}
							};

						})
					;
				}
			});

			debug('num promises=', P.length);

			return Promise.all(P).then(p => {
				debug('in Promise.all');
				return p;
			}, reason => {
				debug('in Promise.all rejecting:', reason)
			});

		})
		.catch(err => {
			debug(err);
		})
		;
	}

function getMp3(id){
	return Promise.resolve( "mp3 content for id=" + id );
}

module.exports = {
	podcast : generatePodcast,
	mp3     : getMp3
};
