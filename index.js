const dotenv = require('dotenv').config();
const debug = require('debug')('absorber:index');
const express = require('express');
const app = express();
// const absorber = require('./bin/lib/absorb.js');

app.get('/', (req, res) => {
	res.status(200).end();
});

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.listen(process.env.PORT, function(){
	debug('Server is listening on port', process.env.PORT);
});
