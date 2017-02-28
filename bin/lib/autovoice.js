const fs = require('fs');
const fetch = require('node-fetch');
const debug = require('debug')('autovoice:lib');

const extract = require('./extract-uuid');
const parseRSSFeed = require('./parse-rss-feed');

function generatePodcast(rssUrl){
	debug('rssUrl=', rssUrl);

	return fetch(rssUrl)
		.then(res  => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			debug('feed=', feed);

			const P = feed.channel[0].item.map(item => {

				return extract( item['guid'][0]._ )
					.then(itemUUID => {
						debug('itemUUID=', itemUUID);
						if(itemUUID === undefined){
							return false;
						}

						debug('pretending to TTS, title=', tem.title[0]);

						const audioURL = item.link[0];
						const metadata = {
							uuid : itemUUID,
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

			});

			return Promise.all(P).then(p => {
				debug(p);
				return p;
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
