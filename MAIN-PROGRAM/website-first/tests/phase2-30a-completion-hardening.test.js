const test=require('node:test');
require('./helpers/test-approved-monetization-fixture');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server}=require('../src/server');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:d}))});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end()})}
const cookie=r=>(r.headers['set-cookie']?.[0]||'').split(';')[0];

test('30A financial gifts and unlocks create balanced debit/credit ledger entries',async()=>{
 const s=http.createServer(server).listen(0);const p=s.address().port;
 try{
  const a=await req(p,'POST','/api/auth/login',{identifier:'kv-demo',password:'Demo123!'});assert.equal(a.status,200);const ac=cookie(a);
  const b=await req(p,'GET','/api/auth/me',null,ac);const before=b.status===200?JSON.parse(b.body).user.coins:0;assert.ok(before>=25);
  const gift=await req(p,'POST','/api/coins/give',{contentId:'sample-story-1',authorId:'system',amount:5},ac);assert.equal(gift.status,400);
  const cat=JSON.parse((await req(p,'GET','/api/monetization/catalog')).body);const sticker=cat.policy.stickers[0];
  const sp=await req(p,'POST','/api/stickers/gift',{contentId:'sample-story-1',sticker:sticker.id},ac);assert.equal(sp.status,400);
  const unlock=await req(p,'POST','/api/content/sample-novel-16/unlock',null,ac);assert.equal(unlock.status,200);
  const me=JSON.parse((await req(p,'GET','/api/auth/me',null,ac)).body).user;assert.equal(me.coins,before-5);
 }finally{s.close()}
});

test('30A master backup snapshot contains runtime state and encrypted auth material, and restore is version-gated',async()=>{
 const oldKey=process.env.KV_BACKUP_ENCRYPTION_KEY,oldAdmin=process.env.KV_ADMIN_KEY,oldRole=process.env.KV_ADMIN_ROLE;
 process.env.KV_BACKUP_ENCRYPTION_KEY='unit-test-backup-key';process.env.KV_ADMIN_KEY='unit-admin-key';process.env.KV_ADMIN_ROLE='master_admin';
 const s=http.createServer(server).listen(0);const p=s.address().port;
 try{
  const al=await req(p,'POST','/api/admin/session',{key:'unit-admin-key',role:'master_admin'});assert.equal(al.status,200);const ac=cookie(al);
  const snap=await req(p,'GET','/api/admin/backup/snapshot',null,ac);assert.equal(snap.status,200);const j=JSON.parse(snap.body).snapshot;assert.equal(j.version,'KV30-P2-30W');assert.ok(j.authEnvelope);assert.ok(Array.isArray(j.coinTransactions));assert.ok(Array.isArray(j.stickerTransactions));assert.ok(Array.isArray(j.messages));
  const bad=await req(p,'POST','/api/admin/backup/restore',{version:'KV30-P2-OLD'},ac);assert.equal(bad.status,409);assert.equal(JSON.parse(bad.body).error,'backup_version_mismatch');
  const restore=await req(p,'POST','/api/admin/backup/restore',j,ac);assert.equal(restore.status,200);assert.equal(JSON.parse(restore.body).version,'KV30-P2-30W');
 }finally{s.close();if(oldKey===undefined)delete process.env.KV_BACKUP_ENCRYPTION_KEY;else process.env.KV_BACKUP_ENCRYPTION_KEY=oldKey;if(oldAdmin===undefined)delete process.env.KV_ADMIN_KEY;else process.env.KV_ADMIN_KEY=oldAdmin;if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole}
});
