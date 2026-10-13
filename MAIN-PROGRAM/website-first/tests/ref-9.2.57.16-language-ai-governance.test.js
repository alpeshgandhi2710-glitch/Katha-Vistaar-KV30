const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const management=require('../../backend/src/services/ai-management');
const inference=require('../../backend/src/services/ai-internal-inference');
const internalFirewall=require('../../backend/src/services/internal-gate-firewall');
const router=require('../../backend/src/services/ai-model-router');
const tts=require('../../backend/src/services/ai-tts-runtime');
const externalFirewall=require('../../backend/src/services/external-gate-firewall');
const comm=require('../../shared/ai-communication-registry.json');
const benchmarks=require('../config/ai-domain-benchmarks-v30.json');
const LANG=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];

test('REF-9.2.57.16 — all 31 managed Internal AIs are wired to handler, internal gate, communication and specialist routing',()=>{
 const ids=Object.keys(management.roles);
 assert.equal(ids.length,31); assert.equal(Object.keys(inference.handlers).length,31); assert.equal(Object.keys(benchmarks.cases).length,31); assert.equal(internalFirewall.listInternalAIGates().length,31); assert.equal(comm.agents.length,31); assert.equal(Object.keys(router.SPECIALIST_TASKS).length,31);
 for(const id of ids){assert.ok(inference.handlers[id],id);assert.ok(internalFirewall.aiGateFor(id),id);assert.ok(comm.agents.includes(id),id);assert.ok(router.SPECIALIST_TASKS[id],id);assert.equal(management.roles[id].externalAllowed,false,id);}
});

test('REF-9.2.57.16 — every managed Internal AI receives the exact 23-language contract',()=>{
 for(const id of Object.keys(management.roles)) for(const language of LANG){
   const r=inference.infer({aiId:id,task:'language contract smoke',input:'A short neutral test.',context:{language}});
   assert.equal(r.ok,true,`${id}:${language}`); assert.equal(r.language,language,`${id}:${language}`); assert.equal(r.result.languageSupport.allSupported,true,`${id}:${language}`);
 }
});

test('REF-9.2.57.16 — TTS resolves per-language capability without inventing coverage',()=>{
 for(const language of LANG){const c=tts.languageCapability(language);assert.equal(c.language,language);assert.equal(typeof c.internal.providerReady,'boolean');assert.ok(Array.isArray(c.external.providers));assert.ok(c.external.providers.every(x=>x.verifiedCoverage===false || x.coverageVerificationRequired===false));}
});

test('REF-9.2.57.16 — external layer is double-gated and currently OFF',()=>{
 const policy=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','ai-provider-policy.json'),'utf8'));
 assert.equal(policy.external.enabled,false);
 const profile=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','external-gate-configuration-profile-v30.json'),'utf8'));
 assert.ok(profile.aiSpecialist.length>=77);
 assert.ok(profile.aiSpecialist.every(x=>x.enabled===false));
 assert.ok(profile.providerAlternate.every(x=>x.enabled===false));
});

test('REF-9.2.57.16 — an OFF external gate is denied even if caller supplies externalEnabled=true',()=>{
 const r=externalFirewall.authorize({gateId:'gate_75',externalEnabled:true,actor:'master_admin',input:'safe',idempotencyKey:'test-off-gate'});
 assert.equal(r.ok,false); assert.equal(r.reason,'external_gate_switch_off');
});

test('REF-9.2.57.16 — language governance is internal-first and memory promotion remains separate',()=>{
 const g=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','language-runtime-governance-v30.json'),'utf8'));
 assert.equal(g.internalLayer.enabled,true);assert.equal(g.internalLayer.authoritative,true);assert.equal(g.externalLayer.enabled,false);assert.equal(g.externalLayer.failClosed,true);assert.ok(g.memoryRule.includes('separately gated'));
 const memory=JSON.parse(fs.readFileSync(path.join(__dirname,'../../shared/persistence-registry.json'),'utf8'));
 assert.ok(memory.maps.includes('languageRegistry'));assert.ok(memory.maps.includes('aiRiskMemos'));
});
