const fs = require('fs');
const fetch = require('node-fetch');
const debug = require('debug')('autovoice:lib');

const extractUuid = require('./extract-uuid');
const parseRSSFeed = require('./parse-rss-feed');

function generatePodcast(rssUrl){
	debug('rssUrl=', rssUrl);

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

							const audioURL = item.link[0];
							const metadata = {
								uuid : uuid,
								originalURL : audioURL,
								title : item.title[0],
								description : item.description[0],
								published : item.pubDate[0]
							};

							return {
								item,
								metadata,
								audioURL
							};

						})
					;
				}
			});

			debug('num promises=', P.length);

			return Promise.all(P).then(p => {
				debug('in Promise.all');
				debug(p);
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
