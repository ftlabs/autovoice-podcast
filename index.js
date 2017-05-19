const dotenv = require('dotenv').config();
const debug = require('debug')('autovoice:index');
const express = require('express');
const path = require('path');
const app = express();

const autovoice = require('./bin/lib/autovoice');
const formatContentForReading = require('./bin/lib/formatContentForReading');
const individualUUIDs = require('./bin/lib/individualUUIDs');

const authS3O = require('s3o-middleware');

var requestLogger = function(req, res, next) {
    debug("RECEIVED REQUEST:", req.method, req.url);
    next(); // Passing the request to the next handler in the stack.
}

app.use(requestLogger);

// these routes do *not* have s3o

app.use('/static', express.static('static'));

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

const PODCAST_TOKEN = process.env.PODCAST_TOKEN;
if (! PODCAST_TOKEN ) {
  throw new Error('ERROR: PODCAST_TOKEN not specified in env');
}

app.get('/podcast', (req, res) => {
  const rssUrl = req.query.rss;
  const voice  = req.query.voice;
  const token  = req.query.token;

  if (! token)                        { res.status(400).send('This call requires a token parameter.'      ).end();
  } else if (token !== PODCAST_TOKEN) { res.status(401).send('This call requires a valid token parameter.').end();
  } else if(! voice)                  { res.status(400).send('This call requires a voice parameter.'      ).end();
  } else if(! rssUrl)                 { res.status(400).send('This call requires a rss parameter.'        ).end();
  } else {
    autovoice.podcast(rssUrl, voice)
    .then(feed => {
      res.set('Content-Type', 'application/rss+xml');
      res.send(feed);
    })
    ;
  }
});

app.get('/audio.mp3', (req, res) => {
  const id = req.url.split('?')[1];
  if (! id) {
    res.status(400).send('This call requires an id parameter.').end();
  } else {
    autovoice.mp3(id)
    .then(mp3Content => {
      res.set('Content-Type', 'audio/mpeg');
      res.send(mp3Content);
    })
    ;
  }
});

// these route *do* use s3o
app.use(authS3O);

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + '/static/index.html'));
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
  let   text  = req.query.text;
  const voice = req.query.voice;
  const wrap  = req.query.wrap;

  if (wrap == 'yes') {
    var itemData = {
      content : text,
      voiceId : voice,
      title   : "A thing happened",
      author  : "A. N. Author",
    }
    text = formatContentForReading.wrapAndProcessItemData(itemData);
  }

  autovoice.snippetMp3(text, voice)
  .then(mp3Content => {
    res.set('Content-Type', 'audio/mpeg');
    res.send(mp3Content);
  })
});

//--- access points to add/remove/list individual uuids for inclusion in Audio Articles

app.get('/uuids/add/:uuid', (req, res) => {
  res.send(individualUUIDs.add(req.params.uuid));
});

app.get('/uuids/clear', (req, res) => {
  res.send(individualUUIDs.clear());
});

app.get('/uuids', (req, res) => {
  res.send(individualUUIDs.list());
});

//---

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
