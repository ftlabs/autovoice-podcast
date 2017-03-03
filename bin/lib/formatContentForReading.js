const     debug = require('debug')('bin:lib:formatContentForReading');
const striptags = require('striptags');

const ACRONYMS = [
	'BBC',
	'EU',
	'FT',
	'ICE',
	'IMF',
	'LSE',
	'MTS',
	'NAR',
	'UK',
	'US',
	'WPP',
	'WTO',
];

const ACRONYMS_REGEXP = '\b(' + ACRONYMS.join('|') + ')\b';

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
	.replace(/<p[^>]*>/g, '\n')
	.replace(/<\/p[^>]*>/g, '\n')
	;

	content = striptags( content )
	.replace(/"/g, "\'")
	.replace(/\\n(\\n)+/g, '\n')
	;

	// also parse/rewrite some of the firstFT-specific text e.g. the attributions in brackets

	texts.push(content);

	texts.push(`This article was ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`Written by ${itemData.author}`);
	}

  texts.push(`This article was narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`);

	return texts.join("\n");
}
