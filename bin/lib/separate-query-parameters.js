module.exports = function(queryString){

	const data = {};

	queryString = queryString.split('?')[1].split('&').forEach(parameter => {
		const keyAndValue = parameter.split('=');

		if(keyAndValue[1] !== ""){
			data[keyAndValue[0]] = decodeURIComponent(keyAndValue[1]);
		}

	});

	return data;

};