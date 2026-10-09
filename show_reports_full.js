const fs = require('fs');
const path = require('path');
const f = path.join(process.cwd(), 'src', 'controllers', 'reports.js');
console.log('=== FULL FILE (showing line numbers) ===');
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    console.log(String(i + 1).padStart(4) + ' | ' + line);
});
