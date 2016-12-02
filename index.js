const dotenv = require('dotenv').config();
const debug = require('debug');

const absorber = require('./bin/lib/absorb.js');

absorber.poll((1000 * 60) * 2, true);