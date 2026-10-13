'use strict';
// KV30 governed language lifecycle. New languages are staged first and cannot be
// enabled until UI, AI, TTS and deterministic-test evidence is explicitly supplied.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../website-first');
const BASE=path.join(ROOT,'config','languages.json');
const DATA=path.join(ROOT,'data','language-registry.json');
let durableStore=null;
const REQUIRED=['code','name','nativeName','iso639_3'];
function readBase(){return JSON.parse(fs.readFileSync(BASE,'utf8'));}
function loadOverlay(){if(durableStore){const entries={};for(const [k,v] of durableStore.entries())entries[k]=v;return {version:'1.0',entries};}try{return JSON.parse(fs.readFileSync(DATA,'utf8'));}catch{return {version:'1.0',entries:{}};}}
function saveOverlay(v){if(durableStore){durableStore.clear();for(const [k,row] of Object.entries(v.entries||{}))durableStore.set(k,row);return;}fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA,JSON.stringify(v,null,2)+'\n');}
function normalizeCode(v){return String(v||'').trim().toLowerCase().replace(/_/g,'-');}
function validCode(c){return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(c);}
function validateEntry(input){
 const e={...input,code:normalizeCode(input?.code)};
 const errors=[];
 for(const k of REQUIRED)if(!String(e[k]||'').trim())errors.push(`missing_${k}`);
 if(!validCode(e.code))errors.push('invalid_code');
 if(e.code==='en')errors.push('english_is_canonical');
 if(e.iso639_1!==undefined&&e.iso639_1!==null&&e.iso639_1!==''&&!/^[a-z]{2}$/.test(String(e.iso639_1)))errors.push('invalid_iso639_1');
 if(e.iso639_2!==undefined&&e.iso639_2!==null&&e.iso639_2!==''&&!/^[a-z]{3}$/.test(String(e.iso639_2)))errors.push('invalid_iso639_2');
 if(e.status&&!['proposed','validated','approved','enabled','rejected'].includes(e.status))errors.push('invalid_status');
 return {ok:errors.length===0,errors,entry:e};
}
function evidenceReady(e){
 const ev=e?.evidence||{};
 const checks={
  ui:ev.uiCoverage===true,
  ai:ev.aiCoverage===true,
  tts:ev.ttsCoverage===true,
  tests:ev.testCoverage===true,
  governance:ev.governanceReview===true
 };
 return {checks,ready:Object.values(checks).every(Boolean)};
}
function all(){
 const base=readBase();const overlay=loadOverlay();
 const rows=base.languages.map(x=>({...x,status:'enabled',source:'canonical'}));
 rows.unshift({code:'en',name:'English',nativeName:'English',iso639_1:'en',iso639_2:'eng',iso639_3:'eng',enabled:true,scheduled:false,isEnglish:true,status:'enabled',source:'canonical'});
 for(const e of Object.values(overlay.entries||{})){
  if(rows.some(x=>x.code===e.code))continue;
  const readiness=evidenceReady(e);rows.push({...e,enabled:e.status==='enabled',readiness});
 }
 return rows;
}
function get(code){return all().find(x=>x.code===normalizeCode(code))||null;}
function propose(input,actor){
 const check=validateEntry(input);if(!check.ok){const err=new Error(check.errors.join(','));err.code='language_proposal_invalid';throw err;}
 const overlay=loadOverlay();const code=check.entry.code;if(get(code)){const err=new Error('language_already_exists');err.code='language_already_exists';throw err;}
 const entry={...check.entry,status:'proposed',enabled:false,createdAt:new Date().toISOString(),createdBy:actor||'master_admin',evidence:{uiCoverage:false,aiCoverage:false,ttsCoverage:false,testCoverage:false,governanceReview:false}};
 overlay.entries[code]=entry;overlay.updatedAt=new Date().toISOString();saveOverlay(overlay);return entry;
}
function recordEvidence(code,evidence,actor){
 const overlay=loadOverlay();const c=normalizeCode(code),e=overlay.entries?.[c];if(!e){const err=new Error('language_not_proposed');err.code='language_not_proposed';throw err;}
 const next={...e,evidence:{...(e.evidence||{}),...evidence},updatedAt:new Date().toISOString(),updatedBy:actor||'master_admin'};const r=evidenceReady(next);next.status=r.ready?'validated':'proposed';overlay.entries[c]=next;overlay.updatedAt=new Date().toISOString();saveOverlay(overlay);return {...next,readiness:r};
}
function approve(code,actor){
 const overlay=loadOverlay();const c=normalizeCode(code),e=overlay.entries?.[c];if(!e){const err=new Error('language_not_proposed');err.code='language_not_proposed';throw err;}
 const r=evidenceReady(e);if(!r.ready){const err=new Error('language_evidence_incomplete');err.code='language_evidence_incomplete';err.readiness=r;throw err;}
 e.status='approved';e.approvedAt=new Date().toISOString();e.approvedBy=actor||'master_admin';overlay.entries[c]=e;saveOverlay(overlay);return e;
}
function enable(code,actor){
 const overlay=loadOverlay();const c=normalizeCode(code),e=overlay.entries?.[c];if(!e){const err=new Error('language_not_proposed');err.code='language_not_proposed';throw err;}
 if(e.status!=='approved'){const err=new Error('language_not_approved');err.code='language_not_approved';throw err;}
 e.status='enabled';e.enabled=true;e.enabledAt=new Date().toISOString();e.enabledBy=actor||'master_admin';overlay.entries[c]=e;saveOverlay(overlay);return e;
}
function status(){const rows=all();const canonical=rows.filter(x=>x.source==='canonical');const enabled=rows.filter(x=>x.enabled===true);return {version:'KV30-P2-language-lifecycle-v2',canonicalLanguageCount:canonical.length,indianLanguageCount:canonical.filter(x=>x.code!=='en').length,enabledLanguageCount:enabled.length,futureLanguagesAllowed:true,proposed:rows.filter(x=>x.status==='proposed'),validated:rows.filter(x=>x.status==='validated'),approved:rows.filter(x=>x.status==='approved'),enabled, fingerprint:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')}}
function configureStore(map){durableStore=map||null;}
function snapshot(){return durableStore?[...durableStore.entries()]:Object.entries(loadOverlay().entries||{});}
function restore(rows){if(!durableStore)return;durableStore.clear();for(const pair of Array.isArray(rows)?rows:[]){if(Array.isArray(pair)&&pair.length>=2)durableStore.set(String(pair[0]),pair[1]);}}
module.exports={configureStore,all,get,propose,recordEvidence,approve,enable,status,evidenceReady,validateEntry,snapshot,restore};
