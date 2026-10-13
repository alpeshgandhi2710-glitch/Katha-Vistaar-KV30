const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');
const tools=fs.readFileSync(path.join(root,'lib','mobile_tools.dart'),'utf8');
const story=fs.readFileSync(path.join(root,'lib','story_studio.dart'),'utf8');
const contract=JSON.parse(fs.readFileSync(path.join(root,'..','shared','cross-platform-state-parity-v30.json'),'utf8'));
const desktop=fs.readFileSync(path.join(root,'..','desktop-electron','preload.js'),'utf8');
const web=fs.readFileSync(path.join(root,'..','website-first','public','app.js'),'utf8');
test('M59 four-client identity and canonical sync contract',()=>{
 assert.deepEqual(contract.clients,['web','desktop-electron','android','ios']);
 assert.equal(contract.authority,'server');
 assert.match(tools,/Platform\.isAndroid/);assert.match(tools,/Platform\.isIOS/);assert.match(tools,/x-kv30-client/);assert.match(tools,/x-kv-client/);assert.match(tools,/x-kv30-state-hash/);assert.match(tools,/x-kv30-state-sync/);assert.match(tools,/api\/state\/canonical/);assert.ok((tools.match(/x-kv30-state-sync/g)||[]).length>=6);assert.ok((tools.match(/x-kv30-state-hash/g)||[]).length>=6);
 assert.match(desktop,/clientId: 'desktop-electron'/);assert.match(web,/X-KV30-Client/);assert.match(web,/X-KV30-State-Hash/);
 assert.equal(contract.mutationReadMatrix.length,4);
 assert.match(story,/x-kv30-client/);assert.match(story,/x-kv30-state-sync/);assert.match(story,/x-kv30-state-hash/);assert.match(story,/stale_canonical_state/);assert.match(story,/storyAutosavedServer/);assert.match(story,/api\.autosave\(draft\)/);
});
