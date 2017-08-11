const debug = require('debug')('bin:lib:filter-null');

module.exports = function(listWithNulls){

	return listWithNulls.filter(item => {
		return item !== null;
	});

}