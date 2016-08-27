'use strict';

var I = require('./index'),
    fs = require('fs');


var input = fs.readFileSync('/dev/stdin', {'encoding': 'utf8'}),
    output = I.run(input); // , process.argv.slice(2));

process.stdout.write(JSON.stringify(output, null, 2) + "\n");


module.exports = {

};
