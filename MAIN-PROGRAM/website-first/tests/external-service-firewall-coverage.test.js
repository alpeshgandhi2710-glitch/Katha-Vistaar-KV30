'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'config','service-registry-v30.json'),'utf8'));
const gates=JSON.parse(fs.readFileSync(path.join(ROOT,'config','external-gate-configuration-profile-v30.json'),'utf8'));
const firewall=require('../../backend/src/services/external-gate-firewall.js');

test('every operational external service has an explicit two-layer switch and canonical firewall gate',()=>{
 const nonAi=new Map(gates.nonAi.map(x=>[x.gate,x]));const aiGates=new Map((gates.aiSpecialist||[]).map(x=>[x.gate,x]));const providerGates=new Map((gates.providerAlternate||[]).map(x=>[x.gate,x]));
 for(const [id,s] of Object.entries(registry.services)){
   assert.equal(s.internalLayer,'always_on',id);
   assert.equal(s.externalLayer,'master_admin_controlled',id);
   assert.equal(s.externalEnabled,false,id);
   assert.equal(s.firewallRequired,true,id);
   if(s.externalGate){const g=nonAi.get(s.externalGate)||aiGates.get(s.externalGate)||providerGates.get(s.externalGate);assert.ok(g,`${id} -> ${s.externalGate}`);if(g.service)assert.equal(g.service,id,`${id} gate service mismatch`);}
 }
});

test('all 72 alternate provider gates are explicitly registered in the canonical gate profile and firewall-addressable',()=>{ const rows=gates.providerAlternate||[]; assert.equal(rows.length,72); for(const g of rows){ assert.ok(gates.providerAlternate.some(x=>x.gate===g.gate)); const r=firewall.authorize({gateId:g.gate,serviceId:g.service,externalEnabled:false,actor:'master_admin',input:'probe',idempotencyKey:'provider-gate-coverage'}); assert.equal(r.ok,false,g.gate); assert.equal(r.reason,'external_layer_off',g.gate); } });

test('every non-AI gate is firewall-addressable and external authorization is fail-closed',()=>{
 for(const g of gates.nonAi){
   const r=firewall.authorize({gateId:g.gate,externalEnabled:false,actor:'master_admin',input:'probe',idempotencyKey:'coverage'});
   assert.equal(r.ok,false,g.gate);assert.equal(r.reason,'external_layer_off',g.gate);
 }
});

test('firewall status exposes the canonical mandatory checks',()=>{
 const s=firewall.status();
 assert.equal(s.nonAiGateCount,23);assert.equal(s.aiSpecialistGateCount,77);assert.equal(s.projectMemoryGateCount,3);
 assert.deepEqual(s.firewallChecks,[
  'service-and-gate-authority','credential-secret-redaction','input-schema-validation','prompt-injection-and-instruction-confusion-filter','path-and-command-injection-filter','private-project-memory-boundary','cross-user-data-isolation','output-schema-and-safety-validation','timeout-and-retry-budget','idempotency-and-replay-protection','audit-event-on-deny-or-failure','internal-fallback-preserved'
 ]);
});

test('service calls cannot bypass the firewall or cross a gate/service binding',()=>{
 const {createServiceManager}=require('../services/service-manager.js');
 const fs=require('node:fs');const os=require('node:os');
 const root=fs.mkdtempSync('/tmp/kv30-firewall-service-');fs.mkdirSync(path.join(root,'config'));fs.mkdirSync(path.join(root,'data'));fs.copyFileSync(path.join(ROOT,'config','external-service-two-switch-matrix-v30.json'),path.join(root,'config','external-service-two-switch-matrix-v30.json'));
 const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'config','service-registry-v30.json'),'utf8'));
 cfg.services={email:{...cfg.services.email,providerEnv:['KV_EMAIL_API_KEY'],defaultEnabled:false}};
 fs.writeFileSync(path.join(root,'config','service-registry-v30.json'),JSON.stringify(cfg));
 const s=createServiceManager(root,{KV_EMAIL_API_KEY:'x',KV_EMAIL_ENDPOINT:'https://example.invalid',KV_EMAIL_HEALTH_OK:'true'});
 return s.toggleAsync('email',true,'master_admin').then(()=>{
   const blocked=s.safeCall('email',()=> 'must-not-run', 'internal', {input:'api_key: SECRET'});
   assert.equal(blocked.ok,false);assert.equal(blocked.mode,'internal_fallback');assert.ok(['credential-secret-redaction','external_gate_switch_off'].includes(blocked.firewall.inbound?.reason||blocked.firewall.outbound?.reason));
   const wrong=firewall.authorize({gateId:'service_gate_email',serviceId:'sms',externalEnabled:true,actor:'master_admin',input:'hello',idempotencyKey:'x'});
   assert.equal(wrong.ok,false);assert.ok(['service_gate_authority_mismatch','external_gate_switch_off'].includes(wrong.reason));
 });
});
