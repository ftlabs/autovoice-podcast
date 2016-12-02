const debug = require('debug')('bin:lib:audit');
const uuid = require('uuid').v4;

const database = require('./database');

module.exports = function(data){

	data.uuid = uuid();
	data.time = Date.now() / 1000 | 0;

	database.write(data, process.env.AWS_AUDIT_TABLE)
		.catch(err => {
			debug("An error occurred when adding to the audit database", err, data);
		})
	;

}