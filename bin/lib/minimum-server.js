const debug = require('debug')('absorber:index');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
	res.status(200).end();
});

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.listen(process.env.PORT, function(){
	debug('Server is listening');
});