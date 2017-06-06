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
const SAPI_PATH = 'http://api.ft.com/content/search/v1';

function constructSAPIQuery( params ) {

	const defaults = {
		queryString : "",
	   maxResults : 1,
		     offset : 0,
		    aspects : [ "title"], // [ "title", "location", "summary", "lifecycle", "metadata"],
		constraints : []
	};

	const combined = Object.assign({}, defaults, params);

	let queryString = combined.queryString;
	if (queryString == '' && combined.constraints.length > 0 ) {
		queryString = combined.constraints.join(' and ');
	}

	const full = {
  	"queryString": queryString,
  	"queryContext" : {
         "curations" : [ "ARTICLES", "BLOGS" ]
		},
  	"resultContext" : {
			"maxResults" : `${combined.maxResults}`,
		 	    "offset" : `${combined.offset}`,
			   "aspects" : combined.aspects,
			 "sortOrder" : "DESC",
			 "sortField" : "lastPublishDateTime",
			    // "facets" : {"names":["people"], "maxElements":-1}
  	}
	}

	return full;
}

function search(params) {
	const sapiUrl = `${SAPI_PATH}?apiKey=${CAPI_KEY}`;
	const sapiQuery = constructSAPIQuery( params );
	debug(`search: sapiQuery=${JSON.stringify(sapiQuery)}`);

	return fetch(sapiUrl, {
		 method: 'POST',
       body: JSON.stringify(sapiQuery),
		headers: {
			'Content-Type' : 'application/json',
		},
	})
	.then( res  => res.text() )
	.then( text => {
		debug(`search: res.text=${text}`);
		return text;
	})
	.then( text => {
		return {
			params : params,
			sapiObj : JSON.parse(text)
		};
	} )
	;
}

function searchByUUID(uuid) {
	return search({queryString: uuid});
}

function searchLastFewFirstFt(maxResults) {
	return search({queryString: `brand:FirstFT`, maxResults: maxResults});
}

function getLastFewFirstFtMentions(maxResults) {
	return searchLastFewFirstFt(maxResults)
	.then( searchObj => searchObj.sapiObj )
	.then(   sapiObj => {
		let uuids = [];
		if (! sapiObj.results ) {
			debug(`getLastFewFirstFtMentions: no sapiObj.results`);
		} else if (! sapiObj.results[0]) {
			debug(`getLastFewFirstFtMentions: no sapiObj.results[0]`);
		} else if (! sapiObj.results[0].results) {
			debug(`getLastFewFirstFtMentions: no sapiObj.results[0].results`);
		} else if (sapiObj.results[0].results.length == 0) {
			debug(`getLastFewFirstFtMentions: sapiObj.results[0].results.length == 0`);
		} else {
			uuids = sapiObj.results[0].results.map( r => { return r.id; } );
		}
		return uuids
	})
	;
}

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
	searchByUUID,
	searchLastFewFirstFt,
	getLastFewFirstFtMentions,
};
