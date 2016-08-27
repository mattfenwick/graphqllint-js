'use strict';

var P = require('./lib/parser');

function run(text) {
	return P.parse(text);
}


module.exports = {
    'run'          : run          ,

};
