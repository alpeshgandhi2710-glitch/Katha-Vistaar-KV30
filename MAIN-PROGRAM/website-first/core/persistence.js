'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');

function createPersistence(root, env=process.env){
  const enabled=String(env.KV_PERSISTENCE||'true').toLowerCase()!=='false';
  const dir=path.join(root,'data');fs.mkdirSync(dir,{recursive:true});
  const testMode=process.argv.some(x=>String(x).includes('/tests/'))||process.argv.includes('--test')||String(env.NODE_ENV||'').toLowerCase()==='test';
  const runtimeEnv=String(env.KV_ENV||((env.NODE_ENV||'').toLowerCase()==='production'?'production':'development')).toLowerCase()==='production'?'production':'development';
  const defaultPath=testMode?path.join(os.tmpdir(),'katha-vistaar-tests',runtimeEnv,`katha-vistaar-test-${process.pid}.sqlite`):path.join(dir,runtimeEnv,'katha-vistaar.sqlite');
  const dbPath=String(env.KV_DATABASE_PATH||defaultPath);
  let db=null,lastSave=0,dirty=false;
  if(enabled){
    fs.mkdirSync(path.dirname(dbPath),{recursive:true});
    db=new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS kv_state (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at TEXT NOT NULL);');
  }
  const registryPath=path.join(__dirname,'..','..','shared','persistence-registry.json');
  let registry;
  try { registry=JSON.parse(fs.readFileSync(registryPath,'utf8')); } catch (e) { throw new Error(`persistence_registry_unreadable:${e.message}`); }
  const names=Array.isArray(registry?.maps)?registry.maps.map(String):[];
  if(!names.length) throw new Error('persistence_registry_empty');
  if(new Set(names).size!==names.length) throw new Error('persistence_registry_duplicate');
  const encodeMap=(name,m)=>{if(!(m instanceof Map))throw new Error(`persistence_registry_missing:${name}`);return JSON.stringify([...m.entries()]);};
  const decodeMap=(text)=>{try{const a=JSON.parse(text);return Array.isArray(a)?a:[]}catch{return []}};
  function validateMaps(maps){for(const name of names){if(!(maps[name] instanceof Map))throw new Error(`persistence_registry_missing:${name}`);}}
  function load(maps){if(!db)return {loaded:false};validateMaps(maps);const get=db.prepare('SELECT v FROM kv_state WHERE k=?');let count=0;for(const name of names){const row=get.get(name);if(!row)continue;const arr=decodeMap(row.v);const map=maps[name];for(const [k,v] of arr)map.set(k,v);count+=arr.length;}return {loaded:true,count,dbPath};}
  function save(maps,force=false){if(!db)return;validateMaps(maps);const now=Date.now();if(!force&&now-lastSave<250){dirty=true;return;}db.exec('BEGIN IMMEDIATE');try{const st=db.prepare('INSERT INTO kv_state(k,v,updated_at) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,updated_at=excluded.updated_at');const ts=new Date().toISOString();for(const name of names)st.run(name,encodeMap(name,maps[name]),ts);db.exec('COMMIT');lastSave=now;dirty=false;}catch(e){try{db.exec('ROLLBACK')}catch{}throw e;}}
  function flush(maps){if(dirty||lastSave===0)save(maps,true);}
  function status(){return {enabled:!!db,durable:!!db,driver:db?'node:sqlite':'disabled',path:dbPath,dirty,runtimeEnv};}
  return {load,save,flush,status,names:[...names]};
}
module.exports={createPersistence};
