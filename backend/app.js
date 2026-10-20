// Start the Sails app: `npm run dev` (or `node app.js`).
process.chdir(__dirname);

let sails;
let rc;
try {
  sails = require('sails');
  rc = require('sails/accessible/rc');
} catch (err) {
  console.error('Could not load Sails. Did you run `npm install`?');
  console.error(err.stack);
  process.exit(1);
}

sails.lift(rc('sails'));
