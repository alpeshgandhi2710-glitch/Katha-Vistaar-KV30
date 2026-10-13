'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const serviceRegistry=JSON.parse(fs.readFileSync(path.join(ROOT,'config','service-registry-v30.json'),'utf8'));
const slots=JSON.parse(fs.readFileSync(path.join(ROOT,'config','external-provider-slots-v30.json'),'utf8'));

test('internal-first capability matrix covers read/write/speak/audio/reel/learn/help/security in 23 languages',()=>{
 const c=JSON.parse(fs.readFileSync(path.join(ROOT,'config','internal-first-capability-matrix-v30.json'),'utf8'));
 assert.equal(c.internalFirst,true);assert.equal(c.externalOnlyAfterInternalCapabilityFailure,true);assert.equal(c.languages,23);
 for(const k of ['read','write','speak','audio','reel','learn','help','security'])assert.ok(Array.isArray(c.capabilities[k])&&c.capabilities[k].length>0,k);
});

test('every external service has three independent provider slots with fail-closed two-layer controls',()=>{
 const names=Object.keys(serviceRegistry.services);assert.ok(names.length>=20);
 for(const name of names){const s=slots.slots.filter(x=>x.service===name);assert.equal(s.length,3,name);for(const x of s){assert.equal(x.enabled,false,x.id);assert.equal(x.defaultEnabled,false,x.id);assert.equal(x.internalLayer,'always_on',x.id);assert.equal(x.externalLayer,'master_admin_controlled',x.id);assert.equal(x.firewallRequired,true,x.id);assert.equal(x.languageSupport,'all_23_required',x.id);}}
});

test('reserved service gates cover internet, network server, reel media, audio processing and translation',()=>{
 for(const id of ['internet_access','network_server','reel_media','audio_processing','translation']){const s=serviceRegistry.services[id];assert.ok(s);assert.ok(s.externalGate);assert.equal(s.internalLayer,'always_on');assert.equal(s.externalLayer,'master_admin_controlled');assert.equal(s.externalEnabled,false);assert.equal(s.firewallRequired,true);}
});

test('AI model router source is internal-first and external fallback is after internal model failure',()=>{
 const src=fs.readFileSync(path.join(ROOT,'..','backend','src','services','ai-model-router.js'),'utf8');
 assert.ok(src.indexOf("const intelligenceResult=await intelligence.execute") < src.indexOf("const policy=providerPolicy.status()"));
 assert.match(src,/external-fallback-after-internal-failure/);
});


test('provider slots are firewall-routed and cannot bypass the canonical service switch',()=>{
 const src=fs.readFileSync(path.join(ROOT,'services','service-manager.js'),'utf8');
 assert.match(src,/safeCallProviderAsync/);assert.match(src,/providerSlotStatus/);assert.match(src,/externalFirewall\.authorize/);
});

test('TTS provider routing preserves internal-first and provider-specific language verification',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'config','tts-provider-routing-v30.json'),'utf8'));
 assert.equal(cfg.internalFirst,true);assert.equal(cfg.languageCount,23);assert.equal(cfg.externalCandidates.length,3);assert.match(cfg.rule,/internal TTS first/i);
});
