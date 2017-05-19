const fetch = require('node-fetch');
const debug = require('debug')('bin:lib:fetchContent');

const  extractUuid = require('./extract-uuid');
const parseRSSFeed = require('./parse-rss-feed');

function rssItems(rssUrl){
	return fetch(rssUrl)
		.then(res  => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			const items = feed.channel[0].item;
			return items;
		})
		.catch(err => {
			debug(err);
		})
	;
}

// function article(uuid)
// function articleAsItem(uuid)
// function articlesAsItems([uuid,...])

module.exports = {
	rssItems
};
