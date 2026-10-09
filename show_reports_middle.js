const fs = require('fs');
const path = require('path');
const f = path.join(process.cwd(), 'src', 'controllers', 'reports.js');
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
const start = 73; // 0-based index for line 74
const end = 143;  // 0-based index for line 144
for (let i = start; i < Math.min(end, lines.length); i++) {
    const lineNum = i + 1;
    console.log(String(lineNum).padStart(4) + ' | ' + lines[i]);
}
