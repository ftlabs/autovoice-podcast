const  dotenv = require('dotenv').config();
const   debug = require('debug')('autovoice:index');
const express = require('express');
const    path = require('path');
const     app = express();

const               autovoice = require('./bin/lib/autovoice');
const formatContentForReading = require('./bin/lib/formatContentForReading');
const         individualUUIDs = require('./bin/lib/individualUUIDs');
const            fetchContent = require('./bin/lib/fetchContent');
const             validateUrl = require('./bin/lib/validate-url');

// const authS3O = require('s3o-middleware');

const validateRequest = require('./bin/lib/check-token');

var requestLogger = function(req, res, next) {
    debug("RECEIVED REQUEST:", req.method, req.url);
    next(); // Passing the request to the next handler in the stack.
}

app.use(requestLogger);

// these routes do *not* not require s3o or token

app.use('/static', express.static('static'));

app.get('/__gtg', (req, res) => {
	res.status(200).end();
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

// these routes do require s3o or token

if (! process.env.hasOwnProperty('TOKEN')) {
  throw 'process.env.TOKEN not defined';
}

if (process.env.BYPASS_TOKEN !== 'true') {
	app.use(validateRequest);
}

app.get('/podcast', (req, res) => {
  const rssUrl = req.query.rss;
  const voice  = req.query.voice;

  if(        ! voice                 ) { res.status(400).send('This call requires a voice parameter.'      );
  } else if( ! rssUrl                ) { res.status(400).send('This call requires a rss parameter.'        );
  } else if( ! validateUrl(rssUrl)   ) { res.status(400).send('This call requires a valid rss parameter.'  );
  } else {
    autovoice.podcast(rssUrl, voice)
    .then(feed => {
      res.set('Content-Type', 'application/rss+xml');
      res.send(feed);
    })
    ;
  }
});

app.get('/podcastBasedOnFirstFt/:maxResults/:voice', (req, res) => {
  const   maxResults = req.params.maxResults;
  const       voice  = req.params.voice;
  const       token  = req.query.token;
  const skipFirstFtUuids = req.query.skipFirstFtUuids;
  const includeFirstFtUuids = !(skipFirstFtUuids == 'true');

  const requestedUrlWithToken = process.env.SERVER_ROOT + req.originalUrl;
  let requestedUrl = requestedUrlWithToken.replace(/token=[^\/&]+/, 'token=...');

  autovoice.firstFtBasedPodcast(maxResults, requestedUrl, includeFirstFtUuids, voice)
  .then(feed => {
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed);
  })
  ;
});

app.get('/podcastBasedOnList/:voice', (req, res) => {
  const voice  = req.params.voice;
  const token  = req.query.token;

  const requestedUrlWithToken = process.env.SERVER_ROOT + req.originalUrl;
  let requestedUrl = requestedUrlWithToken.replace(/token=[^\/&]+/, 'token=...');

  autovoice.listBasedPodcast(requestedUrl, voice)
  .then(feed => {
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed);
  })
  ;
});

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

app.get('/formatArticleForReading/:uuid', (req, res) => {
  fetchContent.articleAsItem(req.params.uuid)
  .then( item => {
    if (item == null) {
      throw `/formatArticleForReading/${req.params.uuid}: item==null, which probably means the CAPI lookup failed.`;
    }
    return item;
  })
  .then( item => { return formatContentForReading.processText(item.content) } )
  .then( text => { res.send( text ); })
  .catch( err => {
    debug(`/formatArticleForReading/:uuid: err=${err}`);
    res.status(400).send( err.toString() ).end();
	})
  ;
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

//--- access points to fetch content

app.get('/content/rssItems', (req, res) => {
  const url = req.query.url;
  if( url === undefined || url == "" ) {
    res.status(400).send(`This call requires a rss parameter.`).end();
  } else if( ! validateUrl(url) ) {
    res.status(400).send(`This call requires a valid rss parameter.`).end();
  } else {
    fetchContent.rssItems(url)
    .then( items => { res.json( items ); })
    .catch( err => {
      res.status(400).send( debug(err) ).end();
  	})
    ;
  }
});

app.get('/content/article/:uuid', (req, res) => {
  fetchContent.article(req.params.uuid)
  .then( article => { res.json( article ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

app.get('/content/articleAsItem/:uuid', (req, res) => {
  fetchContent.articleAsItem(req.params.uuid)
  .then( item => { res.json( item ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

app.get('/content/articlesAsItems', (req, res) => {
  fetchContent.articlesAsItems( individualUUIDs.list() )
  .then( items => { res.json( items ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

//---

app.get('/validate', (req, res) => {
  let isValid = false;
  if (req.query.hasOwnProperty('url')) {
    isValid = validateUrl(req.query.url);
  }
  res.json( {isValid} );
});

//---

app.get('/content/search/:uuid', (req, res) => {
  fetchContent.searchByUUID(req.params.uuid)
  .then( item => { res.json( item ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

app.get('/content/searchLastFewFirstFt/:maxResults', (req, res) => {
  fetchContent.searchLastFewFirstFt(req.params.maxResults)
  .then( item => { res.json( item ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

app.get('/content/getLastFewFirstFtMentionedUuids/:maxResults', (req, res) => {
  fetchContent.getLastFewFirstFtMentionedUuids(req.params.maxResults)
  .then( item => { res.json( item ); })
  .catch( err => {
    res.status(400).send( debug(err) ).end();
	})
  ;
});

//---

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
