'use strict';

var P = require('./lib/parser');
var B = require('./lib/astbuilder');

function cst(text) {
	return P.parse(text);
}

function ast(text) {
	const parsed = cst(text);
	if (parsed.status === 'success') {
		return B.build(parsed.value.result);
	}
	return parsed;
}

module.exports = {
    'cst' : cst,
    'ast' : ast
};
