'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../');
test('R50-M13 release retains explicit cross-platform source-of-truth contract',()=>{
 const p=path.join(root,'FINAL-AUDIT-EVIDENCE','R50-M13-PLATFORM-SOURCE-OF-TRUTH-CONTRACT.md');
 const s=fs.readFileSync(p,'utf8'); for(const x of ['followers/following','likes','comments/replies','messages','subscriptions/entitlements','coins','Development and Production']) assert.match(s,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('R50-M13 release contains no live secret values in confidential secret bundle',()=>{
 const dir=path.join(root,'MASTER-ADMIN-CONFIDENTIAL','confidential-config');
 const s=fs.readFileSync(path.join(dir,'KV30-MASTER-ADMIN-SECRETS.json'),'utf8'); assert.match(s,/"valuesIncluded":false/);
 const env=path.join(dir,'KV30-MASTER-ADMIN-SECRETS.env'); assert.equal(fs.existsSync(env),false);
});
test('R50-M13 damaged-only restore skips healthy entries',()=>{
 const script=path.join(root,'MASTER-ADMIN-CONFIDENTIAL','backup-recovery','restore-damaged-only.js');
 assert.ok(fs.existsSync(script)); const tmp=fs.mkdtempSync('/tmp/kv30-m13-'); const backup=path.join(tmp,'backup'),target=path.join(tmp,'target'),manifest=path.join(tmp,'damage.json'); fs.mkdirSync(backup,{recursive:true}); fs.mkdirSync(target,{recursive:true});
 fs.writeFileSync(path.join(backup,'a.txt'),'backup-a'); fs.writeFileSync(path.join(backup,'b.txt'),'backup-b'); fs.writeFileSync(path.join(target,'b.txt'),'healthy-b');
 const h=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 fs.writeFileSync(manifest,JSON.stringify({files:[{path:'a.txt',damaged:true,sha256:h(path.join(backup,'a.txt'))},{path:'b.txt',damaged:false,sha256:h(path.join(backup,'b.txt'))}]}));
 const {spawnSync}=require('node:child_process'); const r=spawnSync(process.execPath,[script,manifest,backup,target],{encoding:'utf8',timeout:15000}); assert.equal(r.status,0); assert.equal(fs.readFileSync(path.join(target,'a.txt'),'utf8'),'backup-a'); assert.equal(fs.readFileSync(path.join(target,'b.txt'),'utf8'),'healthy-b');
});
test('R50-M13 Master Admin transfer helper requires an explicit target identity',()=>{
 const script=path.join(root,'MASTER-ADMIN-CONFIDENTIAL','master-admin-rights-patch','master-admin-authority-transfer.js'); const {spawnSync}=require('node:child_process'); const r=spawnSync(process.execPath,[script,path.join('/tmp','kv30-m13-authority.json')],{encoding:'utf8',env:{...process.env,KV_TARGET_MASTER_ADMIN_ID:''},timeout:15000}); assert.notEqual(r.status,0); assert.match(String(r.stderr||r.stdout),/KV_TARGET_MASTER_ADMIN_ID_required/);
});
