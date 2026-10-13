const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const ROOT=path.join(__dirname,'..'); const SRC=path.join(ROOT,'..');
test('release integrity: monetization/ad registries are valid JSON and contain test samples',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(ROOT,'data/managed-monetization.json'),'utf8'));
 assert.equal(m.version,'KV30-P2-30W'); assert.ok(!fs.readFileSync(path.join(ROOT,'data/managed-monetization.json'),'utf8').endsWith('\\n')); assert.ok(Array.isArray(m.stickers)&&m.stickers.length>=15); assert.ok(Array.isArray(m.subscriptions)&&m.subscriptions.length>=2);
 const a=JSON.parse(fs.readFileSync(path.join(SRC,'shared/internal-ad-registry.json'),'utf8'));
 assert.equal(a.version,'KV30-P2-30W'); assert.ok(Array.isArray(a.campaigns)&&a.campaigns.length>=2);
});
