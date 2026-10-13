'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createServiceManager}=require('../services/service-manager');
const {createComicLoraService}=require('../services/comic-lora-service');
const adapter=require('../services/comic-lora-provider-adapter');
const firewall=require('../../backend/src/services/external-gate-firewall');
const ROOT=path.resolve(__dirname,'..');

test('Comic LoRA has a dedicated service switch plus three dedicated boundary gates',()=>{
 const gates=JSON.parse(fs.readFileSync(path.join(ROOT,'config','external-capability-gates-v30.json'),'utf8'));
 assert.equal(gates.service,'comic_lora');
 assert.deepEqual(gates.gates.map(x=>x.gate),['service_gate_comic_lora','gate_comic_lora_inbound','gate_comic_lora_rights','gate_comic_lora_outbound']);
 assert.equal(gates.gates.filter(x=>x.enabled===false).length,4);
 assert.equal(firewall.status().externalCapabilityGateCount,4);
 for(const id of gates.gates.map(x=>x.gate)){
  const denied=firewall.authorize({gateId:id,serviceId:'comic_lora',externalEnabled:false,actor:'master_admin',input:'probe',idempotencyKey:`test:${id}`});
  assert.equal(denied.ok,false,id);assert.equal(denied.reason,'external_layer_off',id);
 }
});

test('Comic LoRA external service is Master-Admin switched, health-gated, and uses internal fallback when OFF',async()=>{
 let failPrompt=false;
 const server=http.createServer(async(req,res)=>{
  if(req.url==='/system_stats'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"system":{"ok":true}}');}
  if(req.url==='/prompt'&&req.method==='POST'){
   if(failPrompt){res.writeHead(503);return res.end('{"error":"down"}');}
   res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"prompt_id":"mock-lora-job-1","number":1,"node_errors":{}}');
  }
  if(req.url==='/history/mock-lora-job-1'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"mock-lora-job-1":{"status":{"status_str":"success","completed":true},"outputs":{"8":{"images":[{"filename":"character-lock.png","subfolder":"","type":"output"}]}}}}');}
  res.writeHead(404);res.end();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const env={
  NODE_ENV:'test',
  KV_COMIC_LORA_PROVIDER:'comfyui',KV_COMIC_LORA_API_KEY:'test-secret',
  KV_COMIC_LORA_ENDPOINT:`http://127.0.0.1:${port}`,
  KV_COMIC_LORA_LICENSE_APPROVED:'true',KV_COMIC_LORA_DATA_POLICY_APPROVED:'true'
 };
 const sm=createServiceManager(ROOT,env);
 const lora=createComicLoraService({services:sm,env});
 assert.equal(sm.get('comic_lora').enabled,false);
 assert.throws(()=>sm.toggle('comic_lora',true,'admin'),/master_admin_required/);
 const ready=await sm.healthCheck('comic_lora');assert.equal(ready.available,true);assert.equal(ready.health.passed,true);
 const on=await sm.toggleAsync('comic_lora',true,'master_admin');assert.equal(on.enabled,true);assert.equal(sm.capability('comic_lora').layer,'external');
 const workflow={'1':{class_type:'LoraLoader',inputs:{lora_name:'arjuna-character.safetensors',strength_model:0.8,strength_clip:0.8}}};
 const generated=await lora.generate({characterId:'arjuna',prompt:'Arjuna in a forest scene',loraName:'arjuna-character.safetensors',workflow,rights:{rightsApproved:true,referenceAssetApproved:true,externalDataApproved:true}});
 assert.equal(generated.ok,true);assert.equal(generated.mode,'external_comfyui');assert.equal(generated.providerJobId,'mock-lora-job-1');
 const status=await lora.status('mock-lora-job-1');assert.equal(status.ok,true);assert.equal(status.completed,true);assert.equal(status.outputs[0].filename,'character-lock.png');
 failPrompt=true;
 const failed=await lora.generate({characterId:'arjuna',prompt:'Failure fallback',loraName:'arjuna-character.safetensors',workflow,rights:{rightsApproved:true,referenceAssetApproved:true,externalDataApproved:true}});
 assert.equal(failed.ok,false);assert.equal(failed.fallback,true);assert.equal(failed.mode,'internal_fallback');assert.equal(failed.value.mode,'internal_character_comic_continuity');
 sm.toggle('comic_lora',false,'master_admin');
 const off=await lora.generate({characterId:'arjuna',prompt:'External OFF',loraName:'arjuna-character.safetensors',workflow,rights:{rightsApproved:true,referenceAssetApproved:true,externalDataApproved:true}});
 assert.equal(off.ok,false);assert.equal(off.mode,'internal_fallback');assert.equal(off.fallback,true);
 server.close();
});

test('Comic LoRA rights boundary rejects unapproved external reference data',()=>{
 assert.throws(()=>adapter.validateRights({rightsApproved:false,referenceAssetApproved:true,externalDataApproved:true}),/comic_lora_rightsApproved_required/);
});


test('Comic LoRA external asset is explicitly governed as PASS-ASSET and is not silently bundled',()=>{
 const asset=JSON.parse(fs.readFileSync(path.join(ROOT,'config','comic-lora-asset-contract-v30.json'),'utf8'));
 assert.equal(asset.serviceId,'comic_lora');
 assert.equal(asset.classification,'PASS-ASSET');
 assert.equal(asset.requirement,'external_lora_asset');
 assert.equal(asset.bundledInKv30,false);
 assert.equal(asset.requiredBeforeLiveCharacterLockAcceptance,true);
 assert.equal(asset.masterAdminAuthority,true);
 assert.equal(asset.gateBoundary,'gate_comic_lora_rights');
 assert.equal(asset.fallback,'internal_character_comic_continuity');
 assert.equal(asset.provenanceRequired,true);
 assert.equal(asset.integrityRequired,true);
});
