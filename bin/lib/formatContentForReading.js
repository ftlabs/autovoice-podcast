const     debug = require('debug')('bin:lib:formatContentForReading');
const striptags = require('striptags');

const     ffIntroRegexp = new RegExp('<span[^>]+>Sign up to receive FirstFT by email <a[^>]+>here<\/a>');
const speechMarksRegexp = new RegExp('"', "g");
const    newlinesRegexp = new RegExp('\\n(\\n)+', "g");

function reformat(text){
	text = text.replace(/<p[^>]*>/g, '\n').replace(/<\/p[^>]*>/g, '\n');
	return striptags(text);
}

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

	if (itemData.content.match(ffIntroRegexp)) {
		debug(`formatContentForReading: matched ffIntroRegexp in article w/title=${itemData.title}`);
	}

	let content = itemData.content.replace(ffIntroRegexp, "");
	content = reformat( content );
	content = content.replace(speechMarksRegexp, "\'");
	content = content.replace(newlinesRegexp, '\n');

	// also parse/rewrite some of the firstFT-specific text e.g. the attributions in brackets

	texts.push(content);

	texts.push(`This article was ${itemData.title}.`);
	if (itemData.author) {
		texts.push(`Written by ${itemData.author}`);
	}

  texts.push(`This article was narrated by ${itemData['narrator-id']}, as part of an ongoing experiment with artificial voices.`);

	return texts.join("\n");
}
