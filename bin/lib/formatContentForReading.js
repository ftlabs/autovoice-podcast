const     debug = require('debug')('bin:lib:formatContentForReading');
const striptags = require('striptags');

const ACRONYMS = [ // to be expanded: e.g. "BBC" --> "B B C"
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
	'WPP',
	'WTO'
];
const ACRONYMS_PATTERN = `\\b(${ACRONYMS.join('|') })\\b`;
const ACRONYMS_REGEXP  = new RegExp(ACRONYMS_PATTERN, 'g');

const TEXT_REMOVALS = [ // to be snipped out
	'Sign up to receive FirstFT by email here',
	'Test your knowledge with the week in news quiz',
	'Follow [^:]+ on Twitter: @[a-zA-Z0-9\-_]+'
];
const TEXT_REMOVALS_PATTERN = `\\b(${TEXT_REMOVALS.join('|') })\\b`;
const TEXT_REMOVALS_REGEXP = new RegExp(TEXT_REMOVALS_PATTERN, 'ig');

const ELEMENT_REMOVALS = [ // <element>...</element> to be snipped out
	'ft-related',
];
const ELEMENT_REMOVALS_PATTERN = [
	'(',
	ELEMENT_REMOVALS.map(element => { return `<${element}\\b[\\s\\S]*?</${element}>`; }).join('|'), // http://www.regular-expressions.info/dot.html
	')',
].join('');
const ELEMENT_REMOVALS_REGEXP = new RegExp(ELEMENT_REMOVALS_PATTERN, 'ig');

const REPLACEMENT_WORD_PAIRS = [ // replace 1st with 2nd, NB wraps 1st in word breaks
	['per cent', 'percent'],
	['N Korea',  'North Korea'],
	['WaPo',     'wa po'],
	["Donald Trump’s", "Donald Trumps"],
	['Donald Trump', 'Donald Trump,'],
	['Ms',       'Ms.'],
	['firstFT',  'first FT'],
];
const REPLACEMENT_WORD_PAIRS_PATTERN = REPLACEMENT_WORD_PAIRS.map(
	r => { return [new RegExp(`\\b${r[0]}\\b`, 'ig'), r[1]]; }
);

const REPLACEMENT_TEXT_PAIRS = [ // replace 1st with 2nd, NB purely based on text match, with no care about word breaks
	['-a-', ' a '], // e.g. "€60bn-a-month", yes really
	['&amp;',  ' and '],
];
const REPLACEMENT_TEXT_PAIRS_PATTERN = REPLACEMENT_TEXT_PAIRS.map(
	r => { return [new RegExp(`${r[0]}`, 'ig'), r[1]]; }
);

const PERMITTED_SSML_ELEMENTS = [
	'speak',
	'amazon:effect',
	'audio',
	'break',
	'emphasis',
	'p',
	'phoneme',
	'prosody',
	's',
	'say-as',
	'speak',
	'sub',
	'w',
];

function processText(rawContent) {

	let content = rawContent
	.replace(ELEMENT_REMOVALS_REGEXP, ' ') // replace the matched open/close elements with a space
	.replace(/<\/?(p|p [^>]*)>/g, '. ') // replace P tags with dots to contribute to punctuation
	.replace(/<\/?(li|li [^>]*)>/g, '. ') // replace li tags with dots to contribute to punctuation
	;

	const containsSpeak = content.match(/^\s*<speak>/);

	const permittedElements = (containsSpeak)? PERMITTED_SSML_ELEMENTS : [];

	console.log(`processText: permittedElements=${JSON.stringify(permittedElements)}, content=${content}`)

	content = striptags( content, permittedElements, ' ')
	.replace(/\\n/g, '\n')       // convert \\n
	.replace(/\n+/g, ' ')        // convert newlines
	.replace(/\.(\s*\.)+/g, '.') // compress multi dot and space combos
	.replace(/\s+/g, ' ')        // compress multiple spaces
	;

	if (! containsSpeak) {
		content = content.replace(/"/g,   "\'");      // convert speechmarks
	}

	if (content.match(/Sign up to receive FirstFT/)) {
		content = content.replace(/\.\s+\(([a-zA-Z ]+)\)/g, (match, p1) => { return `. (as reported by ${p1}). `; });
		content = content.replace(/\.\s+\(([a-zA-Z, ]+)\s*,\s*([a-zA-Z ]+)\)/g, (match, p1, p2) => { return `. (as reported by ${p1}, and ${p2}). `; });
	}

	content = content.replace(TEXT_REMOVALS_REGEXP, ' ');

	for( let r of REPLACEMENT_TEXT_PAIRS_PATTERN ) {
		content = content.replace( r[0], r[1] );
	}

	for( let r of REPLACEMENT_WORD_PAIRS_PATTERN ) {
		content = content.replace( r[0], r[1] );
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

	let texts = [];

	texts.push(`This article is narrated by Experimental ${itemData.voiceId}.`);
	texts.push( itemData.content + '.' );

	texts.push(`It is titled ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`and was written by ${itemData.author}.`);
	}
  texts.push(`This article was narrated by ${itemData.voiceId}, as part of an ongoing FT Labs experiment with artificial voices.`);

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
