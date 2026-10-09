const fs = require('fs');

const content = {
  name: 'messmate',
  version: '1.0.0',
  description: 'Mess/Mess hall meal and expense management system',
  main: 'src/server.js',
  scripts: {
    start: 'node src/server.js',
    dev: 'nodemon src/server.js'
  },
  license: 'ISC',
  dependencies: {
    bcrypt: '^5.1.1',
    dotenv: '^16.4.5',
    ejs: '^3.1.10',
    express: '^4.19.2',
    'express-session': '^1.18.0',
    helmet: '^7.1.0',
    pg: '^8.12.0'
  },
  devDependencies: {
    nodemon: '^3.1.7'
  }
};

fs.writeFileSync('package.json', JSON.stringify(content, null, 2));
console.log('package.json written successfully');
