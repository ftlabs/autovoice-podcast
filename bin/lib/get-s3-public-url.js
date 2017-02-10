module.exports = function(uuid){
	return `https://s3-${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_AUDIO_BUCKET}/${uuid}.${process.env.DELIVERED_MEDIA_FORMAT}`
};