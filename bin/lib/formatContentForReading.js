const     debug = require('debug')('bin:lib:formatContentForReading');
const striptags = require('striptags');

const ACRONYMS = [
	'BBC',
	'EU',
	'FBI',
	'FT',
	'ICE',
	'IMF',
	'IPO',
	'LSE',
	'MTS',
	'NAR',
	'NYSE',
	'UK',
	'US',
	'WPP',
	'WTO'
];

const ACRONYMS_PATTERN = `\\b(${ACRONYMS.join('|') })\\b`;
const ACRONYMS_REGEXP  = new RegExp(ACRONYMS_PATTERN, 'g');
debug(`ACRONYMS_REGEXP=${ACRONYMS_REGEXP}`);

module.exports = function(itemData) {

	let texts = [
		`This article is narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`,
		itemData.title
	];

	if (itemData.author) {
		texts.push(`Written by ${itemData.author}`);
	}

	// <span class="ft-bold">Sign up to receive FirstFT by email
	// <a title="FirstFT" href="http://nbe.ft.com/nbe/profile.cfm?firstft=Y">here</a> </span>

	let content = itemData.content
	.replace(/<span[^>]+>Sign up to receive FirstFT by email <a[^>]+>here<\/a>/g, '')
	.replace(/<p[^>]*>/g, '. ')
	.replace(/<\/p[^>]*>/g, '. ')
	;

	content = striptags( content )
	.replace(ACRONYMS_REGEXP, match => { return match.split('').join('.') })
	.replace(/"/g, "\'")
	.replace(/\\n(\\n)+/g, '\n')
	.replace(/\. (\. )+/g, '. ')
	;

	// also parse/rewrite some of the firstFT-specific text e.g. the attributions in brackets

	texts.push(content);

	texts.push(`This article was titled ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`This article was written by ${itemData.author}.`);
	}

  texts.push(`This article was narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`);

	return texts.join("\n");
}
