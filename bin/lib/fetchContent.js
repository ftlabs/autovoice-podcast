// This module makes use of 'node-fetch' plus some extra data munging for a variety of content sources. 

const fetch = require('node-fetch');
const debug = require('debug')('bin:lib:fetchContent');

const     extractUuid = require('./extract-uuid');
const    parseRSSFeed = require('./parse-rss-feed');
const individualUUIDs = require('./individualUUIDs');

const CAPI_KEY = process.env.CAPI_KEY;
if (! CAPI_KEY ) {
	throw new Error('ERROR: CAPI_KEY not specified in env');
}

const CAPI_PATH = 'http://api.ft.com/enrichedcontent/';

function parseRssItemToItem( rssItem ){
	const itemData = {
		content : rssItem.description[0],
		title   : rssItem.title[0],
		guid    : rssItem.guid[0],
		pubdate : rssItem.pubDate[0], // <-- NB this should be the now time,
		author  : rssItem.author[0],
		uuid    : extractUuid( rssItem.guid[0] ),
	}

	return itemData;
}

function rssItems(rssUrl){
	return fetch(rssUrl)
		.then(     res  => res.text()                         )
		.then(     text => parseRSSFeed(text)                 )
		.then(     feed => feed.channel[0].item               )
		.then( rssItems => rssItems.map( parseRssItemToItem ) )
		.then( rssItems => rssItems.map( item => {
			item.rssUrl = rssUrl;
			return item;
		})
	)
		// .catch(err => {
		// 	debug(err);
		// })
	;
}

function article(uuid) {
	const capiUrl = `${CAPI_PATH}${uuid}?apiKey=${CAPI_KEY}`;

	return fetch(capiUrl)
	.then( res   => res.text() )
	.then( text  => JSON.parse(text) )
	// .catch( err => {
	// 	debug(err);
	// })
	;
}

function parseArticleJsonToItem( json ){

	const itemData = {
		content : json.bodyXML,
		title   : json.title,
		guid    : json.webUrl,
		pubdate : json.publishedDate, // <-- NB this should be the now time,
		author  : json.byline,
		uuid    : extractUuid(json.id),
	}

	return itemData;
}

function articleAsItem(uuid) {
	return article(uuid)
	.then( json  => parseArticleJsonToItem(json) )
	// .catch( err => {
	// 	debug(err);
	// })
	;
}

function articlesAsItems() {
	const uuids = individualUUIDs.list();
	const promises = uuids.map(articleAsItem);
	return Promise.all( promises );
}

module.exports = {
	rssItems,
	article,
	articleAsItem,
	articlesAsItems,
};
