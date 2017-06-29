# FT Labs Generates Automated Voices For RSS Feed of Articles

Basic gist:

* convert a full-text RSS feed into a podcast, for subsequent ingestion into the audio-articles system

More details

* from the input RSS feed, each item's description element is processed to knock it into a shape that will then be better narrated by the TextToSpeech engine, e.g. removing HTML tags, splitting some otherwise-mis-pronounced acronyms such as CEO into separate letters, etc
* the auto-generated MP3 files are cached in-memory, based on a persistent identifier including the hash code of the processed description text, the chosen voice
   * a caveat is that if the service reboots, the MP3 url will not work until the source RSS feed has been re-processed. This was deemed ok since the intended use case for this service involves immediate consumption of the MP3 files once they have been generated as part of the podcast.
* there are assorted other endpoints for exposing some of the text processing and generating raw snippets of MP3 for fragments of text.

# new end points

* /podcastBasedOnFirstFt/:maxResults/:voice?token=TOKEN
   * returns an RSS feed with MP3 of each item (aka a podcast), for the most recent few firstFT articles and all the FT articles they in turn refer to
* /podcastBasedOnFirstFt/:maxResults/:voice?token=TOKEN&skipFirstFtUuids=true
   * as above, but without the firstFT articles
* /podcast?token=TOKEN&voice=VOICE_ID&rss=URL_OF_ARTICLE_RSS_FEED
   * return full podcast feed, including refs to mp3 files
   * VOICE_ID needs to match one of the known voices
   * TOKEN needs to match the value of env param: PODCAST_TOKEN
* /audio.mp3?id=ID_OF_MP3_CONTENT
   * returns MP3 content
   * ID_OF_MP3_CONTENT would come from the output of /podcast
   * this requires the /podcast endpoint to have been invoked first
* /format?text=some words to be processed
   * optional, &compare=yes (default=no)
   * returns processed text
   * to show how the text is munged before being passed to TTS
* /static/format.html
   * a form which invokes the /format endpoint
* /snippet.mp3?text=some words to be processed and spoken&voice=voiceId
   * returns MP3 content
   * to pass a fragment of text through the pre-processor and then to TTS to test changes to the pre-processing
* /static/snippet.html
   * a form which invokes the /snippet.mp3 endpoint

# Environment Parameters

When building locally, specify them in a local file, .env (and NB, this must not be included in the git repo, hence has a specific line in .gitignore). When deploying to Heroku, they need to be specified in the app's settings, Config Variables.

The following are mandatory params, the absence of which will kill the app on startup:

* TTS_URL=URL_OF_THE_TEXT_TO_SPEECH_SERVICE
* TTS_TOKEN=...
* PODCAST_TOKEN=...
* CAPI_KEY=...

These are for local builds:

* SERVER_ROOT=TRANSPORT_AND_DOMAIN_OF_SERVICE
   * to use when constructing the podcast feed
   * e.g. when developing locally, http://localhost:8060
* DEBUG=autovoice:\*,bin:lib:\*
* NO_S3O=true # if you want to skip the s3o step when building locally
