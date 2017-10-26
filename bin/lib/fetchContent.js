// This module makes use of 'node-fetch' plus some extra data munging for a variety of content sources.

const fetch = require('node-fetch');
const debug = require('debug')('bin:lib:fetchContent');

const     extractUuid = require('./extract-uuid');
const    parseRSSFeed = require('./parse-rss-feed');

const directly = require('./directly'); 	// trying Rhys' https://github.com/wheresrhys/directly
const CAPI_CONCURRENCE = (process.env.hasOwnProperty('CAPI_CONCURRENCE'))? process.env.CAPI_CONCURRENCE : 10;

const CAPI_KEY = process.env.CAPI_KEY;
if (! CAPI_KEY ) {
	throw new Error('ERROR: CAPI_KEY not specified in env');
}

const CAPI_PATH = 'http://api.ft.com/enrichedcontent/';
const SAPI_PATH = 'http://api.ft.com/content/search/v1';

const UUID_WEB_URL_PREFIX = 'http://www.ft.com/content/';

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
	.catch(err => {
		debug(`ERROR: search: err=${err}, params=${JSON.stringify(params)}`);
		throw err;
	} )
	;
}

function searchByUUID(uuid) {
	return search({queryString: uuid});
}

function searchLastFewFirstFt(maxResults) {
	return search({queryString: `brand:FirstFT`, maxResults: maxResults});
}

function extractFirstFtIds( sapiObj ){
	let uuids = [];
	if (! sapiObj.results ) {
		debug(`extractFirstFtIds: no sapiObj.results`);
	} else if (! sapiObj.results[0]) {
		debug(`extractFirstFtIds: no sapiObj.results[0]`);
	} else if (! sapiObj.results[0].results) {
		debug(`extractFirstFtIds: no sapiObj.results[0].results`);
	} else if (sapiObj.results[0].results.length == 0) {
		debug(`extractFirstFtIds: sapiObj.results[0].results.length == 0`);
	} else {
		uuids = sapiObj.results[0].results.map( r => { return r.id; } );
	}
	return uuids
}

// <ft-content type=\"http://www.ft.com/ontology/content/Article\" url=\"http://api.ft.com/content/dd033082-49e9-11e7-a3f4-c742b9791d43\" title=\"www.ft.com\">paid up to $1bn</ft-content>
const reFtContent = new RegExp(/<ft-content\s+type=\"http:\/\/www.ft.com\/ontology\/content\/Article\"\s+url=\"http:\/\/api.ft.com\/content\/([a-f0-9-]+)\"/, 'g');

function getLastFewFirstFtMentionedUuids(maxResults, includeFirstFtUuids=false) {
	return searchLastFewFirstFt(maxResults)
	.then( searchObj => extractFirstFtIds(searchObj.sapiObj) )
	.then( firstFtUuids => {
		const promises = firstFtUuids.map(uuid => {
			return article(uuid)
			.catch( err => {
				debug(`ERROR: getLastFewFirstFtMentionedUuids: article uuid=${uuid}, err=${err}`);
				return null;
			})
			;
		});
		const uuids = (includeFirstFtUuids)? firstFtUuids : [];

		return Promise.all(promises)
		.then( articles => {
			return articles.filter(a => {return a !== null;});
		})
		.then(articles => articles.map(article => {return article.bodyXML;} ) )
		.then(bodyXMLs => bodyXMLs.join('') )
		.then(bodyXML => {
			let match;
			while ((match = reFtContent.exec(bodyXML)) !== null) {
				uuids.push(match[1])
			}
			return uuids;
		})
		;
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
	.then( text => {
		if (text.startsWith('Forbidden')) {
			throw `ERROR: fetch article for uuid=${uuid}, text startsWth Forbidden, text=${text}`;
		}
		return text;
	})
	.then( text  => JSON.parse(text) )
	.catch( err => {
		debug(`ERROR: article: err=${err}, capiUrl=${capiUrl}`);
		throw err;
	})
	;
}

function parseArticleJsonToItem( json ){
	const uuid = extractUuid(json.id);

	const itemData = {
		content : json.bodyXML,
		title   : json.title,
		guid    : UUID_WEB_URL_PREFIX + uuid,
		pubdate : json.publishedDate, // <-- NB this should be the now time,
		author  : json.byline,
		uuid    : uuid,
	}

	return itemData;
}

// return null if there was an error with the article, or the parsing
function articleAsItem(uuid) {
	return article(uuid)
	.catch( err => {
		debug(`ERROR: articleAsItem: from article err=${err}, uuid=${uuid}`);
		throw err;
	})
	.then( json => parseArticleJsonToItem(json) )
	.catch( err => {
		debug(`ERROR: articleAsItem: err=${err}, uuid=${uuid}`);
		return null;
	})
	;
}

function articlesAsItems(uuids) {
	debug(`articlesAsItems: uuids.length=${uuids.length}, CAPI_CONCURRENCE=${CAPI_CONCURRENCE}`);

	const articlePromisers = uuids.map( uuid => {
		return function () {
			return articleAsItem(uuid);
		};
	});

	return directly(CAPI_CONCURRENCE, articlePromisers)
	.then( outputs => outputs.filter( op => {return op !== null;}) )
	;
}

module.exports = {
	rssItems,
	article,
	articleAsItem,
	articlesAsItems,
	searchByUUID,
	searchLastFewFirstFt,
	getLastFewFirstFtMentionedUuids,
};
