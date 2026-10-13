'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const runtime=require('../src/services/ai-internal-model-runtime');
const policy=require('../src/services/ai-provider-policy');

test('local model runtime exposes real-provider adapters without cloud dependency',()=>{
 const eps=runtime.endpoints({provider:'auto',baseUrl:'http://127.0.0.1:11434',openAIBaseUrl:'http://127.0.0.1:8080'});
 assert.equal(eps[0].provider,'ollama');assert.match(eps[0].url,/\/api\/chat$/);assert.equal(eps[1].provider,'llama.cpp');assert.match(eps[1].url,/\/v1\/chat\/completions$/);
 assert.equal(runtime.status().noCloudDependency,true);
});

test('local model adapter executes an actual chat response when a local runtime is present',async()=>{
 const old=global.fetch;global.fetch=async(url,opts)=>{assert.match(url,/\/api\/chat$/);const body=JSON.parse(opts.body);assert.equal(body.model,'qwen3:32b');assert.equal(body.stream,false);assert.match(body.messages[0].content,/Response language: gu/);return new Response(JSON.stringify({message:{content:'આંતરિક મોડેલ જવાબ'}}),{status:200,headers:{'content-type':'application/json'}})};
 try{const r=await runtime.generate({aiId:'story_ai',task:'story',input:'ગુજરાતીમાં વાર્તા લખો',language:'gu',constitution:'story constitution'});assert.equal(r.ok,true);assert.equal(r.provider,'ollama');assert.equal(r.language,'gu');assert.equal(r.text,'આંતરિક મોડેલ જવાબ');}finally{global.fetch=old;}
});

test('external layer policy defaults OFF and can be switched by master policy',()=>{
 const original=policy.status();const off=policy.setExternalEnabled(false,'master_admin');assert.equal(off.external.enabled,false);const on=policy.setExternalEnabled(true,'master_admin');assert.equal(on.external.enabled,true);const restored=policy.write(original,'master_admin');assert.equal(restored.external.enabled,original.external.enabled);
});

test('AI router keeps internal contract available when local model is unavailable',async()=>{
 const router=require('../src/services/ai-model-router');
 const old=global.fetch;global.fetch=async()=>{throw new Error('offline');};
 try{const r=await router.routeAsync({aiId:'story_ai',task:'story',input:'test story',context:{actorRole:'user',language:'en'},allowExternal:false});assert.equal(r.ok,true);assert.equal(r.externalUsed,false);assert.equal(r.providerPath,'internal-contract-fallback');assert.equal(r.result.ok,true);}finally{global.fetch=old;}
});

test('master external ON is used only after internal model failure and OFF returns to internal',async()=>{
 const router=require('../src/services/ai-model-router');const old=global.fetch;const original=policy.status();const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key';
 let calls=[];global.fetch=async(url,opts)=>{calls.push(String(url));if(String(url).includes('api.openai.com'))return new Response(JSON.stringify({output_text:'external advisory'}),{status:200,headers:{'content-type':'application/json'}});throw new Error('local offline');};
 try{
  policy.setExternalEnabled(true,'master_admin');const on=await router.routeAsync({aiId:'story_ai',task:'story',input:'hello',context:{actorRole:'user',language:'en'},allowExternal:true});assert.equal(on.externalUsed,true);assert.equal(on.providerPath,'external-fallback-after-internal-failure');
  policy.setExternalEnabled(false,'master_admin');const off=await router.routeAsync({aiId:'story_ai',task:'story',input:'hello',context:{actorRole:'user',language:'en'},allowExternal:true});assert.equal(off.externalUsed,false);assert.equal(off.providerPath,'internal-contract-fallback');
 }finally{policy.write(original,'master_admin');global.fetch=old;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});


test('external billing mode and usage limits are Master Admin controlled',()=>{
 const original=policy.status();
 try{
  const updated=policy.setExternalPolicy({enabled:false,provider:'gemini',billingMode:'free',usageLimits:{maxRequestsPerDay:25,maxTokensPerRequest:2048,maxCostPerDay:5,currency:'USD'}},'master_admin');
  assert.equal(updated.external.billingMode,'free');
  assert.equal(updated.external.provider,'gemini');
  assert.equal(updated.external.usageLimits.maxRequestsPerDay,25);
  assert.equal(updated.external.usageLimits.maxTokensPerRequest,2048);
  assert.equal(updated.external.usageLimits.maxCostPerDay,5);
  assert.throws(()=>policy.setExternalPolicy({billingMode:'paid'},'admin'),e=>e.code==='master_admin_required');
 } finally { policy.write(original,'master_admin'); }
});

test('Qwen3 GGUF aliases are accepted by OpenAI-compatible local runtimes',async()=>{
 const old=global.fetch;global.fetch=async(url)=>new Response(JSON.stringify({data:[{id:'Qwen/Qwen3-32B-GGUF:Q4_K_M'}]}),{status:200,headers:{'content-type':'application/json'}});
 const oldProvider=process.env.KV_INTERNAL_MODEL_PROVIDER;const oldBase=process.env.KV_INTERNAL_MODEL_OPENAI_URL;
 process.env.KV_INTERNAL_MODEL_PROVIDER='llama.cpp';process.env.KV_INTERNAL_MODEL_OPENAI_URL='http://127.0.0.1:8080';
 try{const r=await runtime.health();assert.equal(r.ok,true);assert.equal(r.provider,'llama.cpp');assert.equal(r.modelLoaded,true);}finally{global.fetch=old;if(oldProvider===undefined)delete process.env.KV_INTERNAL_MODEL_PROVIDER;else process.env.KV_INTERNAL_MODEL_PROVIDER=oldProvider;if(oldBase===undefined)delete process.env.KV_INTERNAL_MODEL_OPENAI_URL;else process.env.KV_INTERNAL_MODEL_OPENAI_URL=oldBase;}
});
