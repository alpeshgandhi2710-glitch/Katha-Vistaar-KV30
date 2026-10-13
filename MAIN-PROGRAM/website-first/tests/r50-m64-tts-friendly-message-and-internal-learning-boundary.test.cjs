'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const server=fs.readFileSync(path.join(root,'website-first/src/server.js'),'utf8');
const app=fs.readFileSync(path.join(root,'website-first/public/app.js'),'utf8');
const learning=require(path.join(root,'backend/src/services/ai-learning.js'));
const tts=require(path.join(root,'backend/src/services/ai-tts-runtime.js'));
const cfg=JSON.parse(fs.readFileSync(path.join(root,'website-first/config/ai-learning-loop-v30.json'),'utf8'));
assert.match(server,/ttsLanguageUnavailable/);
assert.match(server,/ttsTemporarilyUnavailable/);
assert.ok(server.indexOf('result=await aiTts.synthesize({text,language,voice:speaker,outputFile:out})') < server.indexOf('aiTts.synthesizeSarvam({text,language,voice:speaker,pace,outputFile:out})'),'local TTS must be attempted before optional external TTS');
const languageCodes=JSON.parse(fs.readFileSync(path.join(root,'website-first/config/ai-language-support-v30.json'),'utf8')).languages.map(x=>x.code);for(const code of languageCodes){const line=app.split(/\r?\n/).find(x=>x.startsWith(`Object.assign(extra.${code},{`)&&x.includes('ttsLanguageUnavailable'));assert.ok(line,`missing localized TTS message bundle for ${code}`);for(const k of ['ttsLanguageUnavailable','ttsTemporarilyUnavailable','ttsExternalUnavailableInternalAttempt','ttsGenerationFailed'])assert.ok(line.includes(k),`${code} missing ${k}`);}
(async()=>{
 const r=await tts.synthesize({text:'test',language:'xx-IN'});
 assert.equal(r.ok,false);assert.equal(r.reason,'unsupported_language');assert.equal(r.silentEnglishFallback,false);
 const st=learning.status();
 assert.equal(st.productionAutoApply,false);assert.equal(st.modelRetrainingAuto,false);
 assert.equal(cfg.externalServiceRequired,false);assert.equal(cfg.productionModelUpdate,'never_automatic');
 assert.match(cfg.ttsGapLearning,/do not claim speech generation/i);
 console.log('PASS M64: user-friendly TTS message keys are wired; unsupported language fails closed; learning is governed candidate staging, not automatic production model retraining.');
})().catch(e=>{console.error(e);process.exit(1)});
