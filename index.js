const dotenv = require('dotenv').config();
const debug = require('debug')('autovoice:index');
const express = require('express');
const app = express();

const autovoice = require('./bin/lib/autovoice');

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
  const mp3Content = autovoice.mp3(id)
  .then(mp3Content => {
    debug('mp3Content=', mp3Content);
    res.send(mp3Content);
  })
});

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
