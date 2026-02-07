const fs = require('fs');
fs.writeFileSync('i_was_here.txt', 'Hello at ' + new Date().toISOString());
console.log('File written');
