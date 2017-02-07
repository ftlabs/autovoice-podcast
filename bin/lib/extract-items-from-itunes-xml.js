const debug = require('debug')('bin:lib:');
const fetch = require('node-fetch');

const extract = require('./extract-uuid');
const parseRSSFeed = require('./parse-rss-feed');
const separateQueryParams = require('./separate-query-parameters');

module.exports = function(feedURL){
	
	return fetch(feedURL)
		.then(res => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			debug(feed);
			const P = feed.channel[0].item.map(item => {

				return extract( item['guid'][0]._ )
					.then(itemUUID => {

						if(itemUUID === undefined){
							return false;
						}

						const audioURL = item.enclosure[0]['$'].url;
						const metadata = separateQueryParams(audioURL);
						metadata.uuid = itemUUID;
						metadata.originalURL = audioURL.split('?')[0];

						return {
							item,
							metadata,
							audioURL
						};

					})
				;

				
			});

			return Promise.all(P);

		})
		.catch(err => {
			debug(err);
		})
	;


}