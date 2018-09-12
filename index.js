const fs = require('fs');
const decoder = require('./decoder.js');

const traces = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const methods = JSON.parse(fs.readFileSync('4bytes.json', 'utf8'));

console.log(decoder(traces, methods));
