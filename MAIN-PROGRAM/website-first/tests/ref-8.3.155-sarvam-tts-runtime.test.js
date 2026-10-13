const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const tts=require('../../backend/src/services/ai-tts-runtime.js');
test('Sarvam TTS adapter builds governed request and persists returned WAV bytes',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-sarvam-')); const out=path.join(dir,'audio.wav'); const old=global.fetch; const oldKey=process.env.KV_TTS_API_KEY; process.env.KV_TTS_API_KEY='test-key';
 const wav=Buffer.alloc(64,1).toString('base64'); let req=null; global.fetch=async(url,opt)=>{req={url,opt};return {ok:true,status:200,json:async()=>({request_id:'req-test',audios:[wav]})};};
 try{const r=await tts.synthesizeSarvam({text:'નમસ્તે',language:'gu-IN',voice:'shubh',pace:1,outputFile:out}); assert.equal(r.ok,true); assert.equal(r.provider,'sarvam'); assert.equal(r.language,'gu-IN'); assert.equal(r.voice,'shubh'); assert.equal(fs.existsSync(out),true); assert.equal(fs.statSync(out).size,64); assert.equal(req.url,'https://api.sarvam.ai/text-to-speech'); const body=JSON.parse(req.opt.body); assert.equal(body.language_code,'gu-IN'); assert.equal(body.speaker,'shubh'); assert.equal(body.pace,1); assert.equal(body.model,'bulbul:v3'); assert.equal(req.opt.headers['api-subscription-key'],'test-key');}
 finally{global.fetch=old;if(oldKey===undefined)delete process.env.KV_TTS_API_KEY;else process.env.KV_TTS_API_KEY=oldKey;fs.rmSync(dir,{recursive:true,force:true});}
});
test('Sarvam TTS adapter rejects unsupported text length and pace',async()=>{const oldKey=process.env.KV_TTS_API_KEY;process.env.KV_TTS_API_KEY='test-key';try{assert.equal((await tts.synthesizeSarvam({text:'x'.repeat(2501),language:'gu-IN'})).reason,'sarvam_text_too_long');assert.equal((await tts.synthesizeSarvam({text:'ok',language:'gu-IN',pace:2.1})).reason,'sarvam_invalid_pace');}finally{if(oldKey===undefined)delete process.env.KV_TTS_API_KEY;else process.env.KV_TTS_API_KEY=oldKey;}});
