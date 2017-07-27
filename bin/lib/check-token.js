const debug = require('debug')('bin:lib:check-token');
const S3O = require('@financial-times/s3o-middleware');

if (! process.env.hasOwnProperty('TOKEN')) {
  throw 'process.env.TOKEN not defined';
}

module.exports = (req, res, next) => {
  debug(`Checking auth to access endpoint`);

	const passedToken = (req.headers.token)? req.headers.token : req.query.token;

	if(passedToken === undefined){
		debug(`No token has been passed to service. Falling through to S3O`);
		S3O(req, res, next);
	} else if(passedToken === process.env.TOKEN){
		debug(`Token was valid`);
		next();
	} else {
    debug(`Token was invalid`);
		res.status(401);
		res.json({
			status : 'err',
			message : 'The token value passed was invalid.'
		});
	}
}
