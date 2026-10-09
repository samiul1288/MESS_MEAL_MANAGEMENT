const fs = require('fs');
const path = require('path');
const f = path.join(process.cwd(), 'src', 'controllers', 'reports.js');
console.log('FILE: ' + f);
console.log('FILE EXISTS: ' + fs.existsSync(f));
const content = fs.readFileSync(f, 'utf8');
console.log('RAW LENGTH: ' + content.length);
const lines = content.split('\n');
console.log('LINE COUNT: ' + lines.length);
for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    console.log('LINE ' + lineNum + ': ' + line);
}
