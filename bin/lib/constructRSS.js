const debug = require('debug')('bin:lib:constructRSS');
const RSS = require('rss');

const SERVER_ROOT = process.env.SERVER_ROOT;
if (! SERVER_ROOT ) {
	throw new Error('ERROR: SERVER_ROOT not specified in env');
}

const MP3_PATH = '/audio.mp3';

function cdataifyElement(element, text){
	return `<${element}><![CDATA[${text}]]></${element}>`;
}

module.exports = function(rssUrl, items) {

	let lines = [
		`<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">`,
    `<channel>`,
			cdataifyElement('title', 'Automated Voices'),
			cdataifyElement('link', rssUrl),
			cdataifyElement('description', 'A Podcast/RSS feed of automated voices of FT articles, based on an RSS feed of article content'),
			cdataifyElement('generator', 'FT Labs autovoice-podcast'),
			cdataifyElement('docs', 'http://blogs.law.harvard.edu/tech/rss'),
			cdataifyElement('language', 'en'),
			cdataifyElement('pubDate', 'Thu, 01 Jan 1970 00:00:01 +0000'),
			cdataifyElement('lastBuildDate', 'Thu, 01 Jan 1970 00:00:01 +0000'),
	    `<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>`,
	];

	items.forEach(item => {
		if (item) {
			lines = lines.concat([
				`<item>`,
					cdataifyElement('title', item.title),
					cdataifyElement('link', SERVER_ROOT + MP3_PATH + '?id=' + encodeURIComponent(item.fileId)),
					cdataifyElement('description', 'deliberately left blank'),
					cdataifyElement('pubDate', item.pubdate),
					`<guid isPermaLink="true">![CDATA[ ${item.guid} ]]</guid>`,
				`</item>`,
			]);
		}
	});

	lines = lines.concat([
		`</channel>`,
		`</rss>`,
	]);

	return lines.join("\n");
}
