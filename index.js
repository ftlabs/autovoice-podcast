const dotenv = require('dotenv').config();
const debug = require('debug')('autovoice:index');
const express = require('express');
const app = express();
// const absorber = require('./bin/lib/absorb.js');

var requestLogger = function(req, res, next) {
    debug("RECEIVED REQUEST:", req.method, req.url);
    next(); // Passing the request to the next handler in the stack.
}

app.use(requestLogger);

app.get('/', (req, res) => {
	res.status(200).end();
});

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.get('/podcast', (req, res) => {
  const rssUrl = req.query.rss;
  res.send('invoked /podcast with rss=' + rssUrl);
});

app.get('/mp3', (req, res) => {
  const id = req.query.id;
  res.send('invoked /mp3 with id=' + id);
});

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
