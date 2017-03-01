const striptags = require('striptags');

module.exports = function(HTML){

	HTML = HTML.replace(/<p[^>]*>/g, '\n').replace(/<\/p[^>]*>/g, '\n');
	return striptags(HTML);

}
