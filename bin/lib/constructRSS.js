const debug = require('debug')('bin:lib:constructRSS');
const   RSS = require('rss');

const SERVER_ROOT = process.env.SERVER_ROOT;
if (! SERVER_ROOT ) {
	throw new Error('ERROR: SERVER_ROOT not specified in env');
}

const MP3_PATH = '/audio.mp3';

/**
 * Get an RSS pubDate from a Javascript Date instance.
 * @param Date - optional
 * @return String
 */
function pubDate(date) {

  if (typeof date === 'undefined') {
    date = new Date();
  }

  var pieces     = date.toString().split(' '),
      offsetTime = pieces[5].match(/[-+]\d{4}/),
      offset     = (offsetTime) ? offsetTime : pieces[5],
      parts      = [
        pieces[0] + ',',
        pieces[2],
        pieces[1],
        pieces[3],
        pieces[4],
        offset
      ];

  return parts.join(' ');
}

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
			cdataifyElement('pubDate', pubDate() ),
			cdataifyElement('lastBuildDate', pubDate() ),
	    `<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>`,
	];

	items.forEach(item => {
		if (item) {
			lines = lines.concat([
				`<item>`,
					cdataifyElement('title', item.title),
					cdataifyElement('link', SERVER_ROOT + '/audio.mp3?' + item.fileId),
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
