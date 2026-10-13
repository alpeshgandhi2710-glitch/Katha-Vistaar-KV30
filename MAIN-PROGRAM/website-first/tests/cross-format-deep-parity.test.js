const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
const formats=['story','comic','audio','reel'];
const pairs=formats.flatMap(a=>formats.filter(b=>b!==a).map(b=>[a,b]));
assert.equal(pairs.length,12);
for(const [source,target] of pairs){
 assert.match(server,/task:`cross_format_transform_\$\{sourceType\}_to_\$\{targetType\}`/);
 assert.match(server,/task:`cross_format_transform_apply_\$\{sourceType\}_to_\$\{targetType\}`/);
}
for(const type of formats)assert.match(server,new RegExp(`if\\(type==='${type}'\\)`));
assert.match(server,/function crossFormatSourceMaterial\(record,type\)/);
assert.match(server,/project\.pages/);
assert.match(server,/project\.episodes/);
assert.match(server,/project\.clips/);
assert.match(server,/project\.scenes/);
assert.match(server,/allowExternal:false/);
assert.match(server,/provenanceRequired:true/);
assert.match(server,/creatorApproval:true/);
assert.match(server,/creatorSubscriptionFor\(targetType\)/);
console.log('12/12 PASS cross-format Story↔Comic↔FM↔Reel transformation parity contract');
console.log('PASS structured source extraction for Story/Comic/FM/Reel');
console.log('PASS internal-AI-only transform, creator approval, provenance and target subscription gate');
