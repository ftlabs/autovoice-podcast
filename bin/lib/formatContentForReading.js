const     debug = require('debug')('bin:lib:formatContentForReading');
const striptags = require('striptags');

const ACRONYMS = [
	'BBC',
	'CEO',
	'CIO',
	'EU',
	'FBI',
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

function processText(rawContent) {

	let content = rawContent
	.replace(/<span[^>]+>Sign up to receive FirstFT by email <a[^>]+>here<\/a>/g, '')
	.replace(/<p[^>]*>/g, '. ')
	.replace(/<\/p[^>]*>/g, '. ')
	;

	content = striptags( content )
	.replace(/Test your knowledge with the week in news +quiz/, ' ')
	.replace(/per cent/, 'percent')
	.replace(ACRONYMS_REGEXP, match => { return match.split('').join('.') })
	.replace(/"/g, "\'")
	.replace(/\\n/g, '\n')
	.replace(/\n+/g, ' ')
	.replace(/\.(\s*\.)+/g, '.')
	.replace(/\s+/g, ' ')
	;

	return content;
}


function wrapped(itemData) {

	let texts = [
		`This article is narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`,
		`This article is titled: ${itemData.title}.`
	];

	if (itemData.author) {
		const author = itemData.author
		.replace(/\s*[bB]y\s+/, '')
		.replace(/,([^,]+)$/, (match, p1) => { return ` and ${p1}. `})
		texts.push(`This article was written by ${author}.`);
	}

	texts.push( processText(itemData.content) );

	texts.push(`This article was titled ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`This article was written by ${itemData.author}.`);
	}

  texts.push(`This article was narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`);

	return texts.join("\n");
}

module.exports = {
	wrapped,
 	processText
};
