const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
function must(needle, label){ if(!src.includes(needle)) throw new Error(`missing governed conversion: ${label}`); }
function mustNot(needle, label){ if(src.includes(needle)) throw new Error(`stale hardcoded callsite: ${label}`); }
must("${x('continue')}", 'ad Continue button');
must("${x('cancel')}", 'Smart Assistant cancel button');
mustNot('id="adContinue">Continue</button>', 'ad Continue');
mustNot('data-smart-close>Cancel</button>', 'Smart Assistant Cancel');
console.log('PASS REF-9.2.57.18-R10: safe existing 23-language keys reused for 2 additional UI call-sites');
