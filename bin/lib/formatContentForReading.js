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
	'NYT',
	'UK',
	'US',
	'WaPo',
	'WAPO',
	'WPP',
	'WTO'
];
const ACRONYMS_PATTERN = `\\b(${ACRONYMS.join('|') })\\b`;
const ACRONYMS_REGEXP  = new RegExp(ACRONYMS_PATTERN, 'g');
debug(`ACRONYMS_REGEXP=${ACRONYMS_REGEXP}`);

const REMOVALS = [
	'Sign up to receive FirstFT by email here',
	'Test your knowledge with the week in news quiz',
	'Follow [^:]+ on Twitter: @[a-zA-Z0-9\-_]+'
];
const REMOVALS_PATTERN = `\\b(${REMOVALS.join('|') })\\b`;
const REMOVALS_REGEXP = new RegExp(REMOVALS_PATTERN, 'ig');
debug(`REMOVALS_REGEXP=${REMOVALS_REGEXP}`);

const REPLACEMENT_PAIRS = [
	['per cent', 'percent'],
	['N Korea',  'North Korea']
];
const REPLACEMENT_PATTERN_PAIRS = REPLACEMENT_PAIRS.map(
	r => { return [new RegExp(`\\b${r[0]}\\b`, 'ig'), r[1]]; }
);

function processText(rawContent) {

	let content = rawContent
	.replace(/<\/?(p|p [^>]*)>/g, '. ') // replace P tags with dots to contribute to punctuation
	;

	content = striptags( content )
	.replace(/"/g,   "\'")       // convert speechmarks
	.replace(/\\n/g, '\n')       // convert \\n
	.replace(/\n+/g, ' ')        // convert newlines
	.replace(/\.(\s*\.)+/g, '.') // compress multi dot and space combos
	.replace(/\s+/g, ' ')        // compress multiple spaces
	;

	if (content.match(/Sign up to receive FirstFT/)) {
		content = content.replace(/\.\s+\(([a-zA-Z, ]+)\)/g, (match, p1) => { return `. (as reported by ${p1}). `; });
	}

	content = content.replace(REMOVALS_REGEXP, ' ');

	for( let rpp of REPLACEMENT_PATTERN_PAIRS ) {
		content = content.replace( rpp[0], rpp[1] );
	}

	content = content
	.replace(ACRONYMS_REGEXP, match => { return match.split('').join(' ') })
	.replace(/ (\d+(?:\.\d+)?)m /g, (match, p1) => { return ` ${p1} million `})

	.replace(/(\s*\.)+/g, '.') // compress dot and space combos
	.replace(/\s+/g, ' ')      // compress multiple spaces
	;

	return content;
}


function wrap(itemData) {

	let texts = [
		`This article is narrated by ${itemData['narrator-id']}, as part of an on-going experiment with artificial voices.`,
		`This article is titled: ${itemData.title}.`
	];

	if (itemData.author) {
		const author = itemData.author
		.replace(/\s*[bB]y\s+/, '')
		.replace(/\s+and\s*$/i, '')
		.replace(/,([^,]+)$/, (match, p1) => { return ` and ${p1}. `})
		texts.push(`This article was written by ${author}.`);
	}

	texts.push( itemData.content + '.' );

	texts.push(`This article was titled ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`This article was written by ${itemData.author}.`);
	}

  texts.push(`This article was narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`);

	return texts.join("\n");
}

function wrapAndProcessItemData(itemData) {

	let text = wrap( itemData );
	let processedText = processText( text );

	return processedText;
}

module.exports = {
	wrapAndProcessItemData,
 	processText
};
