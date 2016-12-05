const dotenv = require('dotenv').config();
require('./bin/lib/minimum-server');

const absorber = require('./bin/lib/absorb.js');

absorber.poll((1000 * 60) * 2, true);
