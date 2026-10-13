const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createPersistence}=require('../core/persistence');
const registry=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','shared','persistence-registry.json'),'utf8'));
const NAMES=registry.maps;
function maps(){return Object.fromEntries(NAMES.map(n=>[n,new Map()]));}
test('30M persistence registry is complete, durable across reopen, and rejects missing maps',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv30m-persist-')); const dbPath=path.join(dir,'state.sqlite');
 const a=maps(); const p1=createPersistence(dir,{KV_PERSISTENCE:'true',KV_DATABASE_PATH:dbPath,NODE_ENV:'test'});
 assert.deepEqual(p1.names,NAMES); assert.equal(p1.load(a).loaded,true);
 a.studioProjects.set('p1',{id:'p1',title:'Persist'}); a.aiIncidents.set('i1',{id:'i1',severity:'low'}); a.contentSnapshots.set('s1',{id:'s1',version:'v1'}); a.payoutRequests.set('pay1',{id:'pay1',status:'pending'});
 p1.save(a,true);
 const b=maps(); const p2=createPersistence(dir,{KV_PERSISTENCE:'true',KV_DATABASE_PATH:dbPath,NODE_ENV:'test'}); p2.load(b);
 assert.deepEqual(b.studioProjects.get('p1'),{id:'p1',title:'Persist'}); assert.deepEqual(b.aiIncidents.get('i1'),{id:'i1',severity:'low'}); assert.deepEqual(b.contentSnapshots.get('s1'),{id:'s1',version:'v1'}); assert.deepEqual(b.payoutRequests.get('pay1'),{id:'pay1',status:'pending'});
 const broken=maps(); delete broken.audioProjects; assert.throws(()=>p2.save(broken,true),/persistence_registry_missing:audioProjects/);
 fs.rmSync(dir,{recursive:true,force:true});
});
