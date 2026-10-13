'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('../src/services/ai-internal-model-runtime');
const tts=require('../src/services/ai-tts-runtime');

test('local model health requires the exact configured model, not just a healthy runtime',async()=>{
 const old=global.fetch;
 global.fetch=async()=>new Response(JSON.stringify({models:[{name:'some-other-model'}]}),{status:200,headers:{'content-type':'application/json'}});
 try{const r=await runtime.health();assert.equal(r.ok,false);assert.equal(r.reason,'configured_local_model_not_ready');assert.equal(r.modelLoaded,false);assert.equal(r.attempts[0].reason,'configured_model_not_loaded');}
 finally{global.fetch=old;}
});

test('local model health passes only when exact configured model is listed',async()=>{
 const old=global.fetch;
 global.fetch=async()=>new Response(JSON.stringify({models:[{name:'qwen3:32b'}]}),{status:200,headers:{'content-type':'application/json'}});
 try{const r=await runtime.health();assert.equal(r.ok,true);assert.equal(r.modelLoaded,true);assert.equal(r.model,'qwen3:32b');}
 finally{global.fetch=old;}
});

test('eSpeak fallback produces a real WAV when available',async()=>{
 const s=tts.providerStatus();
 if(!s.espeak){return;}
 const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
 const out=path.join(os.tmpdir(),`kv30-tts-test-${Date.now()}.wav`);
 try{const r=await tts.synthesize({text:'Katha Vistaar',language:'en',outputFile:out});assert.equal(r.ok,true);assert.equal(r.provider,'espeak');assert.equal(r.neural,false);assert.ok(fs.existsSync(out));assert.ok(fs.statSync(out).size>44);}
 finally{try{fs.unlinkSync(out);}catch{}}
});
