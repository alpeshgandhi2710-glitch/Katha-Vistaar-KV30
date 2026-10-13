'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-tts-lifecycle-'));
process.env.KV_TTS_MODEL_LIFECYCLE_PATH=path.join(tmp,'state.json');
const lifecycle=require('../src/services/ai-tts-model-lifecycle');
const tts=require('../src/services/ai-tts-runtime');
const ROOT=path.resolve(__dirname,'../../website-first');

test('governed lifecycle knows the full 23-language registry and never auto-promotes',()=>{
 const s=lifecycle.status();assert.equal(s.languages,23);assert.equal(s.externalDownloads,false);assert.equal(s.externalUpload,false);assert.equal(s.automaticProductionPromotion,false);
});

test('TTS never uses eSpeak for a language whose voice is not installed',async()=>{
 assert.equal(tts.supportsEspeakLanguage('gu'),true);assert.equal(tts.supportsEspeakLanguage('brx'),false);
 const r=await tts.synthesize({text:'test',language:'brx',outputFile:path.join(tmp,'unsupported.wav')});
 assert.equal(r.ok,false);assert.equal(r.reason,'language_tts_model_unavailable');assert.equal(r.silentEnglishFallback,false);
});

test('TTS learning rejects missing consent and rights before dataset inspection',()=>{
 const r=lifecycle.validateDataset({language:'gu',datasetDir:tmp,manifestFile:path.join(tmp,'missing.json')});
 assert.equal(r.ok,false);assert.equal(r.reason,'tts_training_consent_required');
});

test('TTS learning stages only rights-confirmed local datasets meeting minimum duration and utterance thresholds',()=>{
 const dir=path.join(tmp,'dataset');fs.mkdirSync(dir);const entries=[];
 for(let i=0;i<100;i++){const audio=`${i}.wav`;const f=path.join(dir,audio);fs.writeFileSync(f,Buffer.alloc(64,i));entries.push({audio,text:`Approved sample ${i}`,durationSeconds:18,approved:true,consent:true,rightsConfirmed:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')});}
 const mf=path.join(dir,'manifest.json');fs.writeFileSync(mf,JSON.stringify({language:'gu',consent:true,rightsConfirmed:true,entries}));
 const r=lifecycle.stageCandidate({language:'gu',datasetDir:dir,manifestFile:mf,consent:true,rightsConfirmed:true,createdBy:'test-master'});
 assert.equal(r.ok,true);assert.equal(r.candidate.dataset.utterances,100);assert.equal(r.candidate.dataset.audioSeconds,1800);assert.equal(r.candidate.dataset.externalUpload,false);const premature=lifecycle.promote(r.candidate.id,{actorRole:'master_admin'});assert.equal(premature.ok,false);assert.equal(premature.reason,'tts_model_training_and_evaluation_required');const evalBeforeTrain=lifecycle.recordEvaluation(r.candidate.id,{passed:true,modelLoadPassed:true,languageCoveragePassed:true,audioQualityScore:5,artifactPath:path.join(dir,'missing.onnx'),reviewerRole:'master_admin'});assert.equal(evalBeforeTrain.ok,false);assert.equal(evalBeforeTrain.reason,'tts_model_training_smoke_test_required');
});

test('training, evaluation, promotion and rollback require Master Admin authority and real artifacts',()=>{
 const r=lifecycle.promote('missing',{actorRole:'admin'});assert.equal(r.ok,false);assert.equal(r.reason,'tts_training_candidate_not_found');
 const denied=lifecycle.rollback('gu',{actorRole:'admin'});assert.equal(denied.ok,false);assert.equal(denied.reason,'master_admin_required_for_tts_model_rollback');
});

test('all 23 UI locales define localized TTS status keys without English-only fallback copy',()=>{
 const app=fs.readFileSync(path.join(ROOT,'public/app.js'),'utf8');const codes=JSON.parse(fs.readFileSync(path.join(ROOT,'config/ai-language-support-v30.json'),'utf8')).languages.map(x=>x.code);
 for(const code of codes){const line=app.split(/\r?\n/).find(x=>x.startsWith(`Object.assign(extra.${code},{`)&&x.includes('ttsLanguageUnavailable'));assert.ok(line,`missing TTS locale keys: ${code}`);for(const key of ['ttsLanguageUnavailable','ttsTemporarilyUnavailable','ttsExternalUnavailableInternalAttempt','ttsGenerationFailed'])assert.ok(line.includes(key),`${code} missing ${key}`);}
});

test('localized unsupported TTS response is wired through the production media API',()=>{
 const server=fs.readFileSync(path.join(ROOT,'src/server.js'),'utf8');assert.match(server,/\['unsupported_language','language_tts_model_unavailable','no_enabled_external_tts_provider_for_language','no_local_tts_runtime_and_external_tts_off'\]\.includes\(reason\)\?'ttsLanguageUnavailable'/);
});
