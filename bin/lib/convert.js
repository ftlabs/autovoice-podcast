const debug = require('debug')('bin:lib:convert');
const spawn = require('child_process').spawn;
const ffmpeg = require('ffmpeg-static');

const tmpFolder = process.env.TMP_FOLDER || '/tmp';
const debugFFMPEG = process.env.DEBUG_FFMPEG === "true";

function convertAudioFileToOgg(details){

	// ffmpeg -i input.mp3 -c:a libvorbis -q:a 4 output.ogg
	const outputDestination = `${tmpFolder}/${details.name}.ogg`;

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

	debug(`Beginning conversion of ${details.name} to OGG. It will be written to: ${outputDestination}`);

	const process = spawn(ffmpeg.path, args);

	return new Promise( (resolve, reject) => {

		if(debugFFMPEG === true){

			process.stdout.on('data', (data) => {
				debug(`stdout: ${data}`);
			});

			process.stderr.on('data', (data) => {
				debug(`stderr: ${data}`);
			});
			
		}

		process.on('close', (code) => {

			if(code === 1){
				debug(`FFMPEG exited with status code 1 while converting ${details.filePath} to OGG`);
				reject();
			} else if(code === 0){
				debug("FFMPEG closed and was happy");
				resolve(outputDestination);
			}

		});
		
	});



}

module.exports = {
	ogg : convertAudioFileToOgg
}