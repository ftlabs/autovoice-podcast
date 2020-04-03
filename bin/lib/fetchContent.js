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

const CAPI_PATH = 'https://api.ft.com/enrichedcontent/';
const SAPI_PATH = 'https://api.ft.com/content/search/v1';

const UUID_WEB_URL_PREFIX = 'http://www.ft.com/content/';

const AUDIO_AVAILABLE_PREFIX = process.env.AUDIO_AVAILABLE_PREFIX;
if (! AUDIO_AVAILABLE_PREFIX ) {
	throw new Error('ERROR: AUDIO_AVAILABLE_PREFIX not specified in env');
}

const AUDIO_AVAILABLE_SKIP_METADATA_CSV = process.env.AUDIO_AVAILABLE_SKIP_METADATA_CSV;
if (!AUDIO_AVAILABLE_SKIP_METADATA_CSV) {
	throw new Error('ERROR: AUDIO_AVAILABLE_SKIP_METADATA_CSV not specified in env')
}

const AUDIO_AVAILABLE_SKIP_METADATA = AUDIO_AVAILABLE_SKIP_METADATA_CSV.split(',');

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
		debug(`search: res.text ok`);
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

function getAudioAvailable( uuid ) {
	const url = `${AUDIO_AVAILABLE_PREFIX}${uuid}`;
	// debug(`getAudioAvailable: url=${url}`);
	return fetch( url );
}

function getRecentArticlesWithAvailability(maxResults) {
	// search for latest articles, then check audio-availability of each
	const queryParams = {
		maxResults: maxResults,
		aspects: ["title", "location", "summary", "lifecycle", "metadata"],
	}

	return search(queryParams)
	.then( searchResult => {
		const sapiObj = searchResult.sapiObj;
		let articles = [];
		if( ! sapiObj ) {
			debug(`getRecentArticlesWithAvailability: no sapiObj`);
		} else if (! sapiObj.results ) {
			debug(`getRecentArticlesWithAvailability: no sapiObj.results`);
		} else if (! sapiObj.results[0]) {
			debug(`getRecentArticlesWithAvailability: no sapiObj.results[0]`);
		} else if (! sapiObj.results[0].results) {
			debug(`getRecentArticlesWithAvailability: no sapiObj.results[0].results`);
		} else if (sapiObj.results[0].results.length == 0) {
			debug(`getRecentArticlesWithAvailability: sapiObj.results[0].results.length == 0`);
		} else {
			articles = sapiObj.results[0].results.map( r => {
				let isNotAudioSuitable = false;
				if( r.hasOwnProperty('metadata') ){
					AUDIO_AVAILABLE_SKIP_METADATA.forEach( skipString => {
						const skipPair = skipString.split(':');
						if (skipPair.length === 2) {
							let group, name;
							[group, name] = skipPair;
							if (true) {
								if (r.metadata.hasOwnProperty(group)) {
									const matchingTerms = r.metadata[group].filter( m => { return m.hasOwnProperty('term') && m.term.name === name;} );
									if (matchingTerms.length > 0 ) {
										isNotAudioSuitable = true;
									}
								}
							}
						}
					});
				}
				let metadataSummary = {};
				if (r.hasOwnProperty('metadata')) {
					Object.keys(r.metadata).forEach( group => {
						const groupItems = (Array.isArray(r.metadata[group]))? r.metadata[group] : [r.metadata[group]];
						metadataSummary[group] = groupItems.map(item => item.term.name).join(', ');
					});
				}

				return {
					title: r.title.title,
					id: r.id,
					url: `${UUID_WEB_URL_PREFIX}${r.id}`,
					lastPublishDateTime: r.lifecycle.lastPublishDateTime,
					metadataSummary: metadataSummary,
					isAudioSuitable: ! isNotAudioSuitable,
				}
			} );
		}
		return articles
	})
	.then( articles => {
		const articlesWithAvailability = articles.map( a => {
			return getAudioAvailable( a.id )
			.then( availResponse => {
				a.availabilityStatus = availResponse.status;
				if (!availResponse.ok) {
					debug( `getRecentArticlesWithAvailability: search.then: id=${a.id}: availResponse not ok: status=${availResponse.status}`);
					a.hasAudio = undefined;
					a.durationSecs = undefined;
					a.availabilityUrl = undefined;
					return a;
				} else {
					return availResponse.json()
					.then( availJson => {
						let hasAudio = undefined;
						let durationSecs = undefined;

						if (availJson.hasOwnProperty('duration') && availJson.duration.hasOwnProperty('seconds')) {
							durationSecs = availJson.duration.seconds;
						}
						hasAudio = availJson.haveFile;

						a.hasAudio = hasAudio;
						a.durationSecs = durationSecs;
						a.availabilityUrl = `${AUDIO_AVAILABLE_PREFIX}${a.id}`;
						return a;
					})
				}
			})
			.then( articleWithAvailability => {
				// debug( `getRecentArticlesWithAvailability: search.then: articleWithAvailability: id=${articleWithAvailability.id}, availabilityStatus=${articleWithAvailability.availabilityStatus}, hasAudio=${articleWithAvailability.hasAudio}, durationSecs=${articleWithAvailability.durationSecs}` );
				return articleWithAvailability;
			})
		})
		;
		return Promise.all( articlesWithAvailability );
	})
	;
}


function searchByUUID(uuid) {
	return search({
		queryString: uuid,
		aspects: ["title", "location", "summary", "lifecycle", "metadata"],
});
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

// <ft-content type=\"http://www.ft.com/ontology/content/Article\" url=\"https://api.ft.com/content/dd033082-49e9-11e7-a3f4-c742b9791d43\" title=\"www.ft.com\">paid up to $1bn</ft-content>
const reFtContent = new RegExp(/<ft-content\s+type=\"https?:\/\/www.ft.com\/ontology\/content\/Article\"\s+url=\"https?:\/\/api.ft.com\/content\/([a-f0-9-]+)\"/, 'g');

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
	getRecentArticlesWithAvailability
};
