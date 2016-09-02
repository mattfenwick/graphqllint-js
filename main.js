'use strict';

const I = require('./index');
const A = require('./lib/ast');
const fs = require('fs');

const stage = process.argv[2];

const input = fs.readFileSync('/dev/stdin', {'encoding': 'utf8'});

let output;

switch (stage) {
	case 'cst':
		output = I.cst(input);
		break;
	case 'ast':
		output = I.ast(input);
		break;
	default:
		throw new Error('invalid stage: ' + stage);
}

process.stdout.write(JSON.stringify(output, null, 2) + "\n");


module.exports = {};
