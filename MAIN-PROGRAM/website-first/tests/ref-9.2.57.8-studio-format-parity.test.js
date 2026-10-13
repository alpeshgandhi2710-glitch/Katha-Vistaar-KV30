const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(ROOT,'..','shared','runtime-parity-v30.json'),'utf8'));

test('all four studio formats have governed source/runtime coverage',()=>{
 for(const type of Object.keys(parity.studioFormats)) assert.match(server,new RegExp(`['"]${type}['"]`));
 assert.match(server,/\/api\/studio\/publish\//);
 assert.match(server,/\/api\/media\/audio\/mix/);
 assert.match(server,/\/api\/media\/video\/render/);
 assert.match(server,/\/api\/ai\/cross-format-transform/);
 assert.match(app,/Story Studio/);
 assert.match(app,/Comic Studio/);
 assert.match(app,/FM Studio/);
 assert.match(app,/Reel Studio/);
});

test('development and production share the same format capability contract',()=>{
 assert.equal(parity.runtimes.length,4);
 assert.deepEqual(parity.runtimes.map(x=>x.id),['development_internal','development_external','production_internal','production_external']);
 assert.ok(parity.studioSharedRules.some(x=>x.includes('same governed studio source')));
 assert.ok(parity.studioSharedRules.some(x=>x.includes('may not remove a format capability')));
});
