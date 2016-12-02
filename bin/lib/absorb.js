const fs = require('fs');
const AWS = require('aws-sdk');
const xml2js = require('xml2js');
const fetch = require('node-fetch');
const debug = require('debug')('absorb');

const extract = require('./extract-uuid');
const audit = require('./audit');
const database = require('./database');
const mail = require('./mailer');
const generateS3PublicURL = require('./get-s3-public-url');
const convert = require('./convert');

const S3 = new AWS.S3();

const ingestorAdminUrl = process.env.ADMIN_URL || 'no Admin URL specified';
const tmpPath = process.env.TMP_PATH || '/tmp';

let poll = undefined;

function parseRSSFeed(text){

	return new Promise((resolve, reject) => {

		xml2js.parseString(text, (err, result) => {

			if(err){
				reject(err);
			} else {
				resolve(result.rss);
			}

		});

	});

}

function seperateQueryParams(queryString){

	const data = {};

	queryString = queryString.split('?')[1].split('&').forEach(parameter => {
		const keyAndValue = parameter.split('=');

		if(keyAndValue[1] !== ""){
			data[keyAndValue[0]] = decodeURIComponent(keyAndValue[1]);
		}

	});

	return data;

}

function checkForData(){
	debug("Checking for data at", process.env.AUDIO_RSS_ENDPOINT);
	audit({
		user : "ABSORBER",
		action : 'checkForAudioFiles'
	});
	fetch(process.env.AUDIO_RSS_ENDPOINT)
		.then(res => res.text())
		.then(text => parseRSSFeed(text))
		.then(feed => {
			debug(feed);
			feed.channel[0].item.forEach(item => {
				// Let's check to see if we've already retrieved this item from SL
				extract( item['guid'][0]._ )
					.then(itemUUID => {

						if(itemUUID === undefined){
							return false;
						}

						const audioURL = item.enclosure[0]['$'].url;
						const metadata = seperateQueryParams(audioURL);
						metadata.uuid = itemUUID;
						metadata.originalURL = audioURL.split('?')[0];

						debug(itemUUID);
						debug(audioURL);

						// Check whether or not we have an entry for this item in our databas
						// If we don't, add it.

						database.read({ uuid : itemUUID }, process.env.AWS_METADATA_TABLE)
							.then(item => {

								if(Object.keys(item).length < 1){
									
									debug(`Item ${itemUUID} has no meta data in database. Adding...`, metadata);

									database.write(metadata, process.env.AWS_METADATA_TABLE)
										.then(function(){
											debug(`Item ${itemUUID} in DynamoDB`, metadata);
								
											database.read({uuid : itemUUID}, process.env.AWS_DATA_TABLE)
												.then(d => {

													if(d.Item !== undefined){
														
														const madeAvailable = d.Item.madeAvailable;
														const voiced = new Date(metadata['date-voiced']) / 1000;
														
														if(voiced - madeAvailable > 0){
														
															debug(`Date voiced: ${voiced} Made Available: ${madeAvailable} Turnaround: ${voiced - madeAvailable} seconds`);
															d.Item.turnaround = voiced - madeAvailable;
															database.write(d.Item, process.env.AWS_DATA_TABLE)
														
														}

													}


												})
												.catch(err => {
													debug(`An error occurred writing the turnaround time for ${itemUUID}`, err);
												})
											;

										})
										.catch(err => {
											debug("An error occurred when writing audio meta data to the metadata table.", err, metadata);
										})
									;
								}

							})
							.catch(err => {
								debug(`Database read (${process.env.AWS_METADATA_TABLE}) error for ${itemUUID}`, err);
							})
						;

						// Check if we have a copy of the MP3 from our 3rd party partner.
						// If not, grab it and put it in the S3 bucket

						S3.headObject({
							Bucket : process.env.AWS_AUDIO_BUCKET,
							Key : `${itemUUID}.mp3`
						}, function (err) { 

							if (err && err.code === 'NotFound') {
								// We don't have that audio file, let's grab it
								debug(`We dont have the audio for ${itemUUID}. Fetching from ${item.link}`);
								
								debug(item);

								fetch(audioURL)
									.then(function(res) {
										return res.buffer();
									}).then(function(buffer) {
										debug(buffer);
										S3.putObject({
											Bucket : process.env.AWS_AUDIO_BUCKET,
											Key : `${itemUUID}.${process.env.SL_MEDIA_FORMAT || 'mp3'}`,
											Body : buffer,
											ACL : 'public-read'
										}, function(err){
											if(err){
												debug(err);
											}

											if(process.env.ENVIRONMENT === 'production'){
												mail.send({
															itemUUID: itemUUID,
															title: item['title'] || 'no title specified',
														ftCopyUrl: generateS3PublicURL(itemUUID),
														slCopyUrl: metadata.originalURL,
													ingestorAdminUrl: ingestorAdminUrl
												});
											}


											audit({
												user : "ABSORBER",
												action : 'getAudioFile',
												article : itemUUID
											});
										})
									})
									.catch(err => {
										debug(err);
									})
								;

							} else if(err){
								debug(`An error occurred querying the S3 bucket for ${itemUUID}.mp3`, err);
							} else {
								debug(`The MP3 version of ${itemUUID} is already in the S3 bucket`);
							}

						});

						S3.headObject({
							Bucket : process.env.AWS_AUDIO_BUCKET,
							Key : `${itemUUID}.ogg`
						}, function(err){

							if (err && err.code === 'NotFound') {
								debug(`We don't have an OGG version of ${itemUUID}. Creating conversion job now`);

								if(!convert.check(itemUUID)){

									const localDestination = `${tmpPath}/${itemUUID}.mp3`;
									fetch(audioURL)
										.then(res => {
											const fsStream = fs.createWriteStream(localDestination);
											
											return new Promise((resolve) => {

												fsStream.on('close', function(){
													debug(`${itemUUID}.mp3 has been written to ${localDestination}`);
													resolve();
												})

												res.body.pipe(fsStream);

											});

										})
										.then(function(){
											audit({
												user : 'ABSORBER',
												action : 'convertFileToOGG',
												article : itemUUID
											});
											return convert.ogg({
												filePath : localDestination,
												name : itemUUID
											});
										})
										.then(conversionDestination => {
											debug(`${itemUUID} has been converted to OGG and can be found at ${conversionDestination}`);

											fs.readFile(conversionDestination, (err, data) => {

												S3.putObject({
													Bucket : process.env.AWS_AUDIO_BUCKET,
													Key : `${itemUUID}.ogg`,
													Body : data,
													ACL : 'public-read'
												},function(err){
													
													if(err){
														debug(err);
													} else {
														debug(`${itemUUID}.ogg successfully uploaded to ${process.env.AWS_AUDIO_BUCKET}`);
														fs.unlink(conversionDestination, err => {
															if(err){
																debug(`Unable to delete ${conversionDestination} for file system`, err);
															}
														});
														fs.unlink(localDestination, err => {
															if(err){
																debug(`Unable to delete ${localDestination} for file system`, err);
															}
														});

														audit({
															user : 'ABSORBER',
															action : 'storeConvertedOGGToS3',
															article : itemUUID
														});

													}


												})

											})

										})
										.catch(err => {
											debug(`An error occurred when we tried to convert ${itemUUID}.mp3 to OGG and upload it to S3`, err);
											fs.unlink(localDestination, err => {
												if(err){
													debug(`Unable to delete ${localDestination} for file system`, err);
												}
											});
											fs.unlink(`${tmpPath}/${itemUUID}.ogg`, err => {
												if(err){
													debug(`Unable to delete ${tmpPath}/${itemUUID}.ogg for file system`, err);
												}
											});
										})
									;

								} else {
									debug(`Job to convert ${itemUUID}.mp3 to OGG already exists`);
								}

							} else if(err){
								debug(`An error occurred querying the S3 bucket for ${itemUUID}.ogv`, err);
							} else {
								debug(`The OGV version of ${itemUUID} is already in the S3 bucket`);
							}

						});

					})
				;


			});

		})
		.catch(err => {
			debug(err);
		})
	;

}

function startPolling(interval, now){
	now = now || false;

	if(process.env.AUDIO_RSS_ENDPOINT === undefined){
		debug("AUDIO_RSS_ENDPOINT environment variable is undefined. Will not poll.");
		return false;
	}

	if(process.env.AWS_AUDIO_BUCKET === undefined){
		debug('AWS_AUDIO_BUCKET environment variable is not defined. Will not poll.');
		return false;
	}

	poll = setInterval(checkForData, interval);
	if(now){
		checkForData();
	}

	return true;
}

function stopPolling(){
	clearInterval(poll);
}

module.exports = {
	poll : startPolling,
	stop : stopPolling
};