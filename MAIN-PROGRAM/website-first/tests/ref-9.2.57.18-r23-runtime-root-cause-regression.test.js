'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createManagedMonetization}=require('../core/managed-monetization');
const {createRoyaltyEngine}=require('../core/royalty-engine');
const firewall=require('../../backend/src/services/external-gate-firewall');
const {createServiceManager}=require('../services/service-manager');
const ROOT=path.join(__dirname,'..');

test('R23 external service runtime switch can activate the firewall-bound service gate without enabling the static default',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kv-r23-service-'));fs.mkdirSync(path.join(root,'config'),{recursive:true});fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'config','service-registry-v30.json'),JSON.stringify({services:{email:{enabled:false,defaultEnabled:false,providerEnv:['KV_EMAIL_PROVIDER','KV_EMAIL_API_KEY'],fallback:'in_app_only',externalGate:'service_gate_email',firewallRequired:true}}}));
  fs.writeFileSync(path.join(root,'config','external-service-two-switch-matrix-v30.json'),JSON.stringify({services:[{serviceId:'email',serviceSwitch:'service_gate_email',internalAlwaysOn:true,externalDefaultEnabled:false,masterAdminControlled:true,firewallRequired:true}]}));
  const old=global.fetch;global.fetch=async()=>new Response('ok',{status:200});
  try{
    const env={...process.env,KV_EMAIL_PROVIDER:'test',KV_EMAIL_API_KEY:'secret',KV_EMAIL_ENDPOINT:'http://127.0.0.1:1'};
    const sm=createServiceManager(root,env);const on=await sm.toggleAsync('email',true,'master_admin');assert.equal(on.enabled,true);
    const fw=firewall.authorize({gateId:'service_gate_email',serviceId:'email',externalEnabled:true,serviceSwitchActive:true,actor:'master_admin',idempotencyKey:'r23-service-switch'});
    assert.equal(fw.ok,true);
    const off=sm.toggle('email',false,'master_admin');assert.equal(off.enabled,false);
    const blocked=firewall.authorize({gateId:'service_gate_email',serviceId:'email',externalEnabled:true,serviceSwitchActive:false,actor:'master_admin',idempotencyKey:'r23-service-switch-off'});
    assert.equal(blocked.ok,false);assert.equal(blocked.reason,'external_gate_switch_off');
  } finally {global.fetch=old;fs.rmSync(root,{recursive:true,force:true});}
});

test('R23 managed monetization test fixtures are isolated by root and royalty engine reads the matching fixture',()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'kv-r23-monet-a-'));const b=fs.mkdtempSync(path.join(os.tmpdir(),'kv-r23-monet-b-'));
  for(const root of [a,b]){fs.mkdirSync(path.join(root,'config'),{recursive:true});fs.mkdirSync(path.join(root,'data'),{recursive:true});fs.copyFileSync(path.join(ROOT,'config','managed-monetization.json'),path.join(root,'config','managed-monetization.json'));fs.copyFileSync(path.join(ROOT,'config','royalty-engine.json'),path.join(root,'config','royalty-engine.json'));fs.copyFileSync(path.join(ROOT,'config','royalty-gst-v30.json'),path.join(root,'config','royalty-gst-v30.json'));}
  const ma=createManagedMonetization(a,{record(){}});const mb=createManagedMonetization(b,{record(){}});
  ma.setRoyalty('master_admin',{platformSubscriptionRate:0.11});mb.setRoyalty('master_admin',{platformSubscriptionRate:0.77});
  const ea=createRoyaltyEngine(a,{events:new Map(),ledger:new Map()});const eb=createRoyaltyEngine(b,{events:new Map(),ledger:new Map()});
  assert.equal(ea.calculatePlatformSubscriptionPool({eligibleRevenue:100}).platformSubscriptionRate,0.11);assert.equal(eb.calculatePlatformSubscriptionPool({eligibleRevenue:100}).platformSubscriptionRate,0.77);
  fs.rmSync(a,{recursive:true,force:true});fs.rmSync(b,{recursive:true,force:true});
});

console.log('PASS R23 runtime root-cause regression: service-gate switch integration + test-fixture isolation');
