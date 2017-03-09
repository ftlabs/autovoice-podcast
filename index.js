const dotenv = require('dotenv').config();
const debug = require('debug')('autovoice:index');
const express = require('express');
const app = express();

const autovoice = require('./bin/lib/autovoice');
const formatContentForReading = require('./bin/lib/formatContentForReading');


var requestLogger = function(req, res, next) {
    debug("RECEIVED REQUEST:", req.method, req.url);
    next(); // Passing the request to the next handler in the stack.
}

app.use(requestLogger);
app.use('/static', express.static('static'));

app.get('/', (req, res) => {
	res.status(200).end();
});

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.get('/podcast', (req, res) => {
  const rssUrl = req.query.rss;
  const voice = req.query.voice;
  autovoice.podcast(rssUrl, voice)
  .then(feed => {
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed);
  })
});

app.get('/audio.mp3', (req, res) => {
  const id = req.query.id;

  autovoice.mp3(id)
  .then(mp3Content => {
    res.set('Content-Type', 'audio/mpeg');
    res.send(mp3Content);
  })
});

app.get('/format', (req, res) => {
  const compare = req.query.compare;
  const text = req.query.text;
  const formattedText = formatContentForReading.processText(text);
  res.set('Content-Type', 'text/plain');
  let body = formattedText;
  if (compare === "yes") {
    body = `${text}\n------\n${body}`;
  }
  res.send(body);
});

app.get('/snippet.mp3', (req, res) => {
  const text = req.query.text;
  const voice   = req.query.voice;

  autovoice.snippetMp3(text, voice)
  .then(mp3Content => {
    res.set('Content-Type', 'audio/mpeg');
    res.send(mp3Content);
  })
});

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
