const debug = require('debug')('bin:lib:convert');
const spawn = require('child_process').spawn;
const ffmpeg = require('ffmpeg-static');

const tmpFolder = process.env.TMP_FOLDER || '/tmp';
const debugFFMPEG = process.env.DEBUG_FFMPEG === "true";

const MAX_CONCURRENT_JOBS = process.env.MAX_CONCURRENT_FFMPEG_JOBS || 3;
const jobs = [];
let currentJobs = 0;

function checkJobExistsForFile(id){
	return jobs.some(job => {id === job.name;});
}

function convert(details, args, resolve, reject){
	
	debug(`Beginning conversion of ${details.name} to OGG. It will be written to: ${details.outputDestination}`);

	const process = spawn(ffmpeg.path, args);

	if(debugFFMPEG === true){

		process.stdout.on('data', (data) => {
			debug(`stdout: ${data}`);
		});

		process.stderr.on('data', (data) => {
			debug(`stderr: ${data}`);
		});
		
	}

	process.on('close', (code) => {

		currentJobs -= 1;
		if(code === 1){
			debug(`FFMPEG exited with status code 1 while converting ${details.filePath} to OGG`);
			reject();
		} else if(code === 0){
			debug('FFMPEG closed and was happy');
			resolve(details.outputDestination);
		}

	});

}

function convertAudioFileToOgg(details){
	const outputDestination = `${tmpFolder}/${details.name}.ogg`;
	// ffmpeg -i input.mp3 -c:a libvorbis -q:a 4 output.ogg
	const args = [
		'-i',
		details.filePath,
		'-y',
		'-c:a',
		'libvorbis',
		'-q:a',
		'4',
		outputDestination
	];	

	details.outputDestination = outputDestination;

	return new Promise( (resolve, reject) => {
		jobs.push({
			details, args, resolve, reject
		});
	});

}

setInterval(function(){

	if(currentJobs < MAX_CONCURRENT_JOBS){

		while(currentJobs < MAX_CONCURRENT_JOBS && jobs.length > 0){

			currentJobs += 1;
			const newJob = jobs.shift();
			convert(newJob.details, newJob.args, newJob.resolve, newJob.reject)
			debug(`There are now ${currentJobs} jobs running`);
		
		}

	}

}, 5000);

module.exports = {
	check : checkJobExistsForFile,
	ogg : convertAudioFileToOgg
}