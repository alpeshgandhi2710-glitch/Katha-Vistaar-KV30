const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=fs.readFileSync(path.join(__dirname,'..','src','server.js'),'utf8');

test('M25 discovery feedback is governed and feeds personalized ranking signals',()=>{
 assert.match(server,/\/api\/discovery\/feedback/);
 for(const action of ['discovery_impression','discovery_click','discovery_save','discovery_complete','discovery_cross_format_open','discovery_dismiss']) assert.match(server,new RegExp(action));
 assert.match(server,/feedbackCategoryCounts/);
 assert.match(server,/feedbackTypeCounts/);
 assert.match(server,/crossFormatSignals/);
 assert.match(server,/rankingVersion:'m25-v1'/);
 assert.doesNotMatch(server,/allowExternal:true[^\n]*discovery/);
});
console.log('PASS M25 discovery feedback and ranking signal contract');
