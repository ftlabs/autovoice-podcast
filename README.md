# FT Labs Generates Automated Voices For RSS Feed of Articles

When supplied an RSS feed of articles (where the article body is in the <description>)

* pick a voice
* define a map from id to TTS spec
* pass each article to the TTS service to have the mp3 generated (and cached)
* construct the full podcast rss feed referencing the mp3 id,
   * so that when the podcast is consumed, the request will come to this service for the mp3 file, and it in turn will collect it from the TTS service cache (or local cache)

# new end points

* /podcast?rss=URL_OF_ARTICLE_RSS_FEED
   * return full podcast feed, including refs to mp3 files
* /mp3?id=ID_OF_MP3_CONTENT
   * returns MP3 content
   * ID_OF_MP3_CONTENT would come from the output of /podcast
   * this requires the /podcast endpoint to have been invoked first
* /format?text=some words to be processed
   * returns processed text
   * just to show how the text is munged before being passed to TTS
* /snippet.mp3?text=some words to be processed and spoken&voice=voiceId
   * returns MP3 content
   * to pass a fragment of text through the pre-processor and then to TTS to test changes to the pre-processing
