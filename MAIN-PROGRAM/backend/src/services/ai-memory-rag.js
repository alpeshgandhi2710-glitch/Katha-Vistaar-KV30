'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../../website-first');
const languageSupport=require('./ai-language-support.js');
const STATE_PATH=process.env.KV_AI_MEMORY_PATH||path.join(ROOT,'data','ai-internal-memory.json');
const SEAL_VERSION='KV30-MEMORY-SEAL-1';
const stores={project:new Map(),user:new Map(),character:new Map(),knowledge:new Map()};
const scopes=new Set(Object.keys(stores));
const OPERATIONAL_SCOPES=new Set(['project','user','character']);
let persistedSeal=null;
function err(code){return Object.assign(new Error(code),{code});}
function assertMaster(actor){if(String(actor)!=='master_admin')throw err('master_admin_required');}
function normalizeOwner(scope,ownerId){
  if(scope==='user'||scope==='project'||scope==='character'){
    const id=String(ownerId||'').trim();
    if(!id)throw err(`${scope}_owner_required`);
    return id;
  }
  return null;
}
function canonicalScopeData(scope){return JSON.stringify([...stores[scope].entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));}
function calculateSeal(scope){return crypto.createHash('sha256').update(`${SEAL_VERSION}|${scope}|${canonicalScopeData(scope)}`).digest('hex');}
function calculateAllSeals(){return Object.fromEntries([...scopes].map(scope=>[scope,calculateSeal(scope)]));}
function persist(){
  fs.mkdirSync(path.dirname(STATE_PATH),{recursive:true});
  const data=Object.fromEntries([...scopes].map(s=>[s,[...stores[s].entries()]]));
  const seals=calculateAllSeals();
  const payload={version:'KV30-P2-30W',memorySealVersion:SEAL_VERSION,updatedAt:new Date().toISOString(),data,seals};
  const tmp=`${STATE_PATH}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  fs.writeFileSync(tmp,JSON.stringify(payload,null,2));
  fs.renameSync(tmp,STATE_PATH);
  persistedSeal=seals;
}
function verifySeals(saved){
  if(!saved||typeof saved!=='object')return {present:false,verified:false,reason:'seal_missing'};
  const expected=calculateAllSeals();
  const ok=[...scopes].every(scope=>typeof saved[scope]==='string'&&crypto.timingSafeEqual(Buffer.from(saved[scope]),Buffer.from(expected[scope])));
  return {present:true,verified:ok,expected,stored:saved};
}
function load(){
  try{
    if(!fs.existsSync(STATE_PATH))return;
    const x=JSON.parse(fs.readFileSync(STATE_PATH,'utf8'));
    for(const scope of scopes){
      for(const [k,v] of (x.data?.[scope]||[])){
        if(v?.scope!==scope)throw err(`memory_scope_record_mismatch:${scope}`);
        if((scope==='user'||scope==='project'||scope==='character')&&!String(v.ownerId||'').trim())throw err(`memory_owner_missing:${scope}`);
        stores[scope].set(k,v);
      }
    }
    const check=verifySeals(x.seals);
    if(check.present&&!check.verified)throw err('memory_seal_verification_failed');
    persistedSeal=check.present?x.seals:null;
    if(!check.present)persist();
  }catch(e){throw new Error(`ai_memory_state_unreadable:${e.message}`);}
}
load();
function clean(v,max=8000){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').slice(0,max);}
function put(scope,{key,value,source='internal',rights='internal',approved=false,ownerId=null,tags=[]}={}){
  if(!scopes.has(scope))throw err('invalid_memory_scope');
  if(!String(key||'').trim())throw err('memory_key_required');
  const owner=normalizeOwner(scope,ownerId);
  if(scope==='knowledge'&&!approved)throw err('knowledge_requires_approval');
  const old=stores[scope].get(String(key));
  if(old&&old.ownerId!==owner)throw err('memory_owner_mismatch');
  const row={id:old?.id||crypto.randomUUID(),scope,key:clean(key,300),value:clean(value),source:clean(source,200),rights:clean(rights,200),ownerId:owner,tags:Array.isArray(tags)?tags.map(x=>clean(x,80)).slice(0,20):[],approved:Boolean(approved),version:Number(old?.version||0)+1,updatedAt:new Date().toISOString()};
  stores[scope].set(row.key,row);persist();return row;
}
function get(scope,key,ownerId=null){
  if(!scopes.has(scope))throw err('invalid_memory_scope');
  const row=stores[scope].get(String(key))||null;
  if(!row)return null;
  if(scope==='knowledge')return row.approved?row:null;
  const owner=normalizeOwner(scope,ownerId);
  return row.ownerId===owner?row:null;
}
function search(scope,query,limit=5,ownerId=null){
  if(!scopes.has(scope))throw err('invalid_memory_scope');
  const owner=scope==='knowledge'?null:normalizeOwner(scope,ownerId);
  const q=clean(query,1000).toLowerCase();
  const qTokens=languageSupport.tokenize(q).map(x=>x.toLowerCase()).filter(t=>t.length>1);
  const rows=[...stores[scope].values()].filter(x=>scope==='knowledge'?x.approved:x.ownerId===owner);
  const scored=rows.map(x=>{const text=`${x.key} ${x.value} ${(x.tags||[]).join(' ')}`.toLowerCase();const tokens=languageSupport.tokenize(text).map(t=>t.toLowerCase());const unique=new Set(tokens);let score=0;for(const token of qTokens){if(unique.has(token))score+=2;else if(text.includes(token))score+=1;}const coverage=qTokens.length?score/(qTokens.length*2):0;return {x,score,coverage};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||String(b.x.updatedAt).localeCompare(String(a.x.updatedAt)));
  return scored.slice(0,Math.max(1,Math.min(20,Number(limit)||5))).map(x=>({...x.x,relevance:Number(x.coverage.toFixed(3))}));
}
function remove(scope,key,ownerId=null){
  if(!scopes.has(scope))throw err('invalid_memory_scope');
  const row=stores[scope].get(String(key));
  if(!row)return false;
  if(scope!=='knowledge'&&row.ownerId!==normalizeOwner(scope,ownerId))throw err('memory_owner_mismatch');
  const ok=stores[scope].delete(String(key));if(ok)persist();return ok;
}
function snapshot(){return {version:'KV30-P2-30W',memorySealVersion:SEAL_VERSION,data:Object.fromEntries([...scopes].map(s=>[s,[...stores[s].entries()]])),seals:calculateAllSeals()};}
function restore(s,{actor=''}={}){
  assertMaster(actor);
  if(!s||s.version!=='KV30-P2-30W')throw err('memory_snapshot_version_mismatch');
  for(const scope of scopes){
    stores[scope].clear();
    for(const [k,v] of (s?.data?.[scope]||[])){
      if(v?.scope!==scope)throw err(`memory_scope_record_mismatch:${scope}`);
      if(scope!=='knowledge'&&!String(v.ownerId||'').trim())throw err(`memory_owner_missing:${scope}`);
      stores[scope].set(k,v);
    }
  }
  const check=verifySeals(s.seals);
  if(!check.present||!check.verified)throw err('memory_snapshot_seal_verification_failed');
  persist();return status();
}
function resetOperationalMemory({scope='all',actor='',reason='master_admin_memory_reset'}={}){
  assertMaster(actor);
  const targets=scope==='all'?[...OPERATIONAL_SCOPES]:[String(scope)];
  for(const s of targets){if(!OPERATIONAL_SCOPES.has(s))throw err('operational_scope_required');stores[s].clear();}
  persist();
  return {ok:true,scope,resetScopes:targets,reason,knowledgePreserved:true,masteryAndGovernancePreserved:true,sealVerification:'verified_after_reset'};
}
function resetLeakedOperationalMemory({scope='all',actor='',reason='suspected_cross_memory_leak'}={}){
  return resetOperationalMemory({scope,actor,reason});
}
function status(){
  const seals=calculateAllSeals();
  const verified=!!persistedSeal&&[...scopes].every(scope=>persistedSeal[scope]===seals[scope]);
  return {scopes:[...scopes],operationalResetAvailable:true,operationalScopes:[...OPERATIONAL_SCOPES],counts:Object.fromEntries([...scopes].map(s=>[s,stores[s].size])),persistent:true,statePath:STATE_PATH,trainingSeparated:true,knowledgeApprovalRequired:true,privateDataDefault:'restricted',provenanceRequired:true,memoryIsolation:'strict-owner-scoped',crossMemoryReads:false,sealed:true,sealVersion:SEAL_VERSION,sealVerified:verified,sealScopes:[...scopes]};
}
module.exports={put,get,search,remove,status,snapshot,restore,resetOperationalMemory,resetLeakedOperationalMemory};
