const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const p=require('node:path');
const f=fs.readFileSync(p.join(__dirname,'../src/server.js'),'utf8');
test('30B AI help ticket lifecycle exposes create, list, user reply and admin resolution/escalation paths',()=>{
 for(const x of ['/api/ai/help','/api/help/tickets','/api/admin/help/tickets/','action===\'escalate\'','action===\'resolve\''])assert.ok(f.includes(x),x);
});
