const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('http');
const fs=require('fs');
const path=require('path');
const {server,kv30CanonicalState,kv30CanonicalStateHash}=require('../src/server');

async function req(port,method,path,body,cookie,headers={}){
 return new Promise((resolve,reject)=>{const r=http.request({port,method,path,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers}},res=>{let d='';res.on('data',x=>d+=x);res.on('end',()=>{let j={};try{j=JSON.parse(d)}catch{}resolve({status:res.statusCode,headers:res.headers,json:j,body:d})})});r.on('error',reject);if(body!==undefined)r.write(JSON.stringify(body));r.end()})
}
async function loginDemo(port){const r=await req(port,'POST','/api/auth/login',{identifier:'kv-demo',password:'Demo123!'});assert.equal(r.status,200,JSON.stringify(r.json));return r.headers['set-cookie']?.[0]?.split(';')[0];}
test('R50-M61 server enforces canonical state hash for state-sync mutations',async()=>{
 const s=http.createServer(server);await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;
 try{
  const cookie=await loginDemo(p);
  const canonical=await req(p,'GET','/api/state/canonical',undefined,cookie,{'x-kv30-client':'android','x-kv30-state-sync':'true'});
  assert.equal(canonical.status,200);const hash=canonical.json.stateHash;assert.ok(hash);
  const noHash=await req(p,'POST','/api/likes',{contentId:'missing-content',liked:true},cookie,{'x-kv30-client':'android','x-kv30-state-sync':'true'});
  assert.equal(noHash.status,409);assert.equal(noHash.json.error,'stale_canonical_state');
  const stale=await req(p,'POST','/api/likes',{contentId:'missing-content',liked:true},cookie,{'x-kv30-client':'android','x-kv30-state-sync':'true','x-kv30-state-hash':'bad'});
  assert.equal(stale.status,409);assert.equal(stale.json.error,'stale_canonical_state');assert.equal(stale.json.currentStateHash,hash);
 }finally{s.close()}
});

test('R50-M61 canonical source contains all required authoritative domain groups',()=>{
 const src=kv30CanonicalState.toString();
 for(const token of ['social','monetizationState','story','reader','governance','account','coinTransactions','subscriptionPayments','paymentRecoveries','contentAutosaves','revisions','collaborators','mediaAssets','mediaProgress']) assert.match(src,new RegExp(token));
});

test('R50-M61 first-party clients have no platform-local authoritative database contract',()=>{
 const root=path.join(__dirname,'..');
 const mobile=fs.readFileSync(path.join(root,'..','mobile','lib','mobile_tools.dart'),'utf8')+fs.readFileSync(path.join(root,'..','mobile','lib','story_studio.dart'),'utf8');
 const desktop=fs.readFileSync(path.join(root,'..','desktop-electron','preload.js'),'utf8')+fs.readFileSync(path.join(root,'..','desktop-electron','main.js'),'utf8');
 assert.doesNotMatch(mobile,/sqflite|SQLiteDatabase|Hive|Isar|Drift|Realm|SharedPreferences|NSUserDefaults/);
 assert.doesNotMatch(desktop,/sqlite|better-sqlite3|electron-store|nedb|lowdb/);
 assert.match(mobile,/\/api\/state\/canonical/);
 assert.match(desktop,/clientId: 'desktop-electron'/);
});

test('R50-M61 web and mobile client mutation paths implement stale-state refresh/retry',()=>{
 const web=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
 const mobile=fs.readFileSync(path.join(__dirname,'..','..','mobile','lib','mobile_tools.dart'),'utf8');
 assert.match(web,/stale_canonical_state.*refreshCanonicalState.*getJSON/);
 assert.ok((mobile.match(/stale_canonical_state/g)||[]).length>=6);
});
