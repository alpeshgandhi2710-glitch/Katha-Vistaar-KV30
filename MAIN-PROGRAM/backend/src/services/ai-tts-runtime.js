'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const gateFirewall=require('./internal-gate-firewall.js');
const modelLifecycle=require('./ai-tts-model-lifecycle.js');
const ROOT=path.resolve(__dirname,'../../../website-first');
const CONFIG_PATH=path.join(ROOT,'config','ai-tts-runtime-v30.json');
const LANGUAGE_CONFIG_PATH=path.join(ROOT,'config','language-runtime-governance-v30.json');
const LANGUAGE_SUPPORT_PATH=path.join(ROOT,'config','ai-language-support-v30.json');
const OUT_DIR=path.join(path.resolve(__dirname,'../../../data'),'tts');
function languageContract(){try{return JSON.parse(fs.readFileSync(LANGUAGE_SUPPORT_PATH,'utf8'));}catch{return {languages:[]};}}
function languageGovernance(){try{return JSON.parse(fs.readFileSync(LANGUAGE_CONFIG_PATH,'utf8'));}catch{return {internalLayer:{enabled:true,authoritative:true},externalLayer:{enabled:false,failClosed:true}};}}
function normalizeLanguage(language){const raw=String(language||'').trim().toLowerCase().replace(/_/g,'-');if(!raw)return null;const rows=languageContract().languages||[];const exact=rows.find(x=>String(x.code||'').toLowerCase()===raw);if(exact)return String(exact.code);const base=raw.split('-')[0];const baseMatch=rows.find(x=>String(x.code||'').toLowerCase()===base);return baseMatch?String(baseMatch.code):null;}
function languageCapability(language,voice='default'){const code=normalizeLanguage(language);const c=config();if(!code)return {language:String(language||''),supported:false,internal:{providerReady:false,voiceConfigured:false,modelAvailable:false},external:{defaultOff:true,providers:[]}};const activeModel=modelLifecycle.activeModel(code);const internalVoice=activeModel?.modelPath||c.voices?.[code]?.[voice]||c.voices?.[code]?.default||c.defaultPiperModel||'';const internalModelAvailable=Boolean(internalVoice&&(fs.existsSync(path.resolve(ROOT,internalVoice))||fs.existsSync(internalVoice)));const espeakLanguageAvailable=supportsEspeakLanguage(code);const externalConfigured=[];try{const slots=JSON.parse(fs.readFileSync(path.join(ROOT,'config','external-provider-slots-v30.json'),'utf8')).slots||[];for(const slot of slots.filter(x=>x.service==='tts')){const coverage=slot.languageCodes||slot.verifiedLanguageCodes||[];const covered=!Array.isArray(coverage)||coverage.length===0||coverage.map(String).map(x=>x.toLowerCase()).includes(String(language||code).toLowerCase());externalConfigured.push({gate:slot.gate,providerSlotId:slot.id,enabled:slot.enabled===true,verifiedCoverage:Array.isArray(coverage)&&coverage.length>0?covered:false,coverageVerificationRequired:!(Array.isArray(coverage)&&coverage.length>0)});}}catch{}return {language:code,internal:{providerReady:providerStatus().piper===true,voiceConfigured:Boolean(internalVoice),modelAvailable:internalModelAvailable,espeakLanguageAvailable},external:{defaultOff:languageGovernance().externalLayer?.enabled!==true,providers:externalConfigured}};}
function sarvamLanguageSupported(language){const code=String(language||'').toLowerCase().split('-')[0];try{const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'config','tts-provider-routing-v30.json'),'utf8'));return (policy.externalCandidates||[]).filter(x=>x.service==='tts').some(x=>Array.isArray(x.coverage)&&x.coverage.map(v=>String(v).toLowerCase().split('-')[0]).includes(code));}catch{return false;}}
function config(){let c;try{c=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));}catch{c={enabled:true,preferredProvider:'piper',fallbackProvider:'espeak',externalProvider:'sarvam',outputDir:OUT_DIR,voices:{}}}return {...c,outputDir:process.env.KV_TTS_OUTPUT_DIR||c.outputDir||OUT_DIR,preferredProvider:process.env.KV_TTS_PROVIDER||c.preferredProvider||'piper',sarvamEndpoint:process.env.KV_TTS_ENDPOINT||c.sarvamEndpoint||'https://api.sarvam.ai/text-to-speech',sarvamApiKey:process.env.KV_TTS_API_KEY||'',sarvamModel:process.env.KV_TTS_MODEL||c.sarvamModel||'bulbul:v3'};}
function commandAvailable(cmd){try{require('node:child_process').execFileSync(cmd,['--help'],{stdio:'ignore',timeout:3000});return true}catch{return false;}}
function supportsEspeakLanguage(language){const code=String(language||'').split('-')[0].toLowerCase();if(!code||!commandAvailable('espeak'))return false;try{const out=execFileSync('espeak',[`--voices=${code}`],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:3000});return out.split(/\r?\n/).some((line,i)=>i>0&&new RegExp('\\s'+code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s','i').test(line));}catch{return false;}}
function providerStatus(){const c=config();const piper=commandAvailable('piper');const configuredVoices=Object.values(c.voices||{}).flatMap(x=>Object.values(x||{})).filter(Boolean);const defaultModel=String(c.defaultPiperModel||'');const promotedPaths=Object.values(modelLifecycle._state().active||{}).map(x=>x.modelPath).filter(Boolean);const modelPaths=[defaultModel,...configuredVoices,...promotedPaths].filter(Boolean);const modelFiles=modelPaths.filter(x=>fs.existsSync(path.resolve(ROOT,x))||fs.existsSync(x));const neuralReady=piper&&modelFiles.length>0;return {piper,espeak:commandAvailable('espeak'),espeakLanguages:(languageContract().languages||[]).map(x=>String(x.code)).filter(supportsEspeakLanguage),preferred:c.preferredProvider,neuralReady,configuredNeuralModels:modelFiles.length,neuralModelPaths:modelFiles.map(String),outputDir:c.outputDir};}
async function synthesizeSarvam({text,language='en-IN',voice='shubh',pace=1,outputFile,apiKey,endpoint,model='bulbul:v3'}){
 const c=config(); const key=String(apiKey||c.sarvamApiKey||'').trim(); if(!key)return {ok:false,reason:'sarvam_api_key_not_configured'};
 const cleanText=String(text||'').trim(); if(!cleanText)return {ok:false,reason:'empty_text'}; if(cleanText.length>2500)return {ok:false,reason:'sarvam_text_too_long'};
 const p=Number(pace); if(!Number.isFinite(p)||p<0.5||p>2)return {ok:false,reason:'sarvam_invalid_pace'}; if(!sarvamLanguageSupported(language))return {ok:false,reason:'no_enabled_external_tts_provider_for_language',language:String(language)};
 const out=outputFile||path.join(c.outputDir,`kv30-sarvam-${crypto.randomUUID()}.wav`);
 try{
  const r=await fetch(String(endpoint||c.sarvamEndpoint),{method:'POST',headers:{'Content-Type':'application/json','api-subscription-key':key},body:JSON.stringify({text:cleanText,language_code:String(language),speaker:String(voice||'shubh').toLowerCase(),pace:p,model:String(model||'bulbul:v3'),output_audio_codec:'wav',speech_sample_rate:24000})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return {ok:false,reason:`sarvam_http_${r.status}`,provider:'sarvam',requestId:data.request_id||null};
  const encoded=Array.isArray(data.audios)?data.audios[0]:null; if(!encoded)return {ok:false,reason:'sarvam_audio_missing',provider:'sarvam',requestId:data.request_id||null};
  const buf=Buffer.from(String(encoded),'base64'); if(buf.length<44)return {ok:false,reason:'sarvam_invalid_audio',provider:'sarvam',requestId:data.request_id||null};
  fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,buf);
  return {ok:true,provider:'sarvam',neural:true,language:String(language),voice:String(voice||'shubh').toLowerCase(),pace:p,model:String(model||'bulbul:v3'),requestId:data.request_id||null,outputFile:out};
 }catch(e){return {ok:false,reason:'sarvam_request_failed',provider:'sarvam',error:String(e.message||e).slice(0,160)};}
}
function run(cmd,args,out,input=''){return new Promise((resolve,reject)=>{fs.mkdirSync(path.dirname(out),{recursive:true});const p=spawn(cmd,args,{stdio:['pipe','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.stdin.end(input);p.on('close',code=>code===0?resolve():reject(new Error(err||`${cmd}_exit_${code}`)));});}
async function synthesize({text,language='en',voice='default',emotion='neutral',outputFile}){const requestedLanguage=String(language||'').trim();const c=config();language=normalizeLanguage(requestedLanguage);if(!language)return {ok:false,reason:'unsupported_language',requestedLanguage,silentEnglishFallback:false};if(c.enabled===false)return {ok:false,reason:'tts_disabled'};if(!text)return {ok:false,reason:'empty_text'};const status=providerStatus();const out=outputFile||path.join(c.outputDir,`kv30-tts-${crypto.randomUUID()}.wav`);let provider=null;
const internalGate=gateFirewall.authorizeInternal({gateId:'service_gate_tts',serviceId:'tts'});
if(!internalGate.ok)return {ok:false,reason:internalGate.reason};
if(status.piper){const promoted=modelLifecycle.activeModel(language);const model=promoted?.modelPath||c.voices?.[language]?.[voice]||c.voices?.[language]?.default||c.defaultPiperModel;if(model && (fs.existsSync(path.resolve(ROOT,model))||fs.existsSync(model))){try{await run('piper',['--model',model,'--output_file',out],out,text).catch(async()=>{throw new Error('piper_generation_failed')});if(!fs.existsSync(out)||fs.statSync(out).size<44)throw new Error('piper_invalid_output');return {ok:true,provider:'piper',neural:true,language,voice,emotion,outputFile:out};}catch(e){if(c.preferredProvider==='piper'&&!status.espeak)return {ok:false,reason:e.message};}}
}
if(status.espeak && supportsEspeakLanguage(language) && (c.fallbackProvider||'espeak')==='espeak'){const rate=emotion==='dramatic'?'150':emotion==='gentle'?'125':emotion==='comic'?'185':'165';const pitch=voice.includes('female')?'65':voice.includes('child')?'75':'45';try{const voiceLanguage=String(language||'en').split('-')[0];await run('espeak',['-v',voiceLanguage,'-s',rate,'-p',pitch,'-w',out],out,text).then(()=>{});if(!fs.existsSync(out)||fs.statSync(out).size<44)throw new Error('espeak_invalid_output');provider='espeak';return {ok:true,provider,neural:false,language,voice,emotion,outputFile:out,warning:'non_neural_fallback'};}catch(e){return {ok:false,reason:e.message};}}
return {ok:false,reason:'language_tts_model_unavailable',language,silentEnglishFallback:false};}
async function synthesizeExternal({text,language='en-IN',voice='default',pace=1,outputFile,actor='master_admin',provider='auto',gateId='service_gate_tts'}={}){
 const requestedLanguage=String(language||'').trim();language=normalizeLanguage(requestedLanguage);if(!language)return {ok:false,reason:'unsupported_language',requestedLanguage,silentEnglishFallback:false};
 const c=config(); const fw=require('./internal-gate-firewall.js').authorizeExternal({gateId,serviceId:'tts',externalEnabled:true,actor,input:String(text||''),idempotencyKey:`tts:${Date.now()}`});
 if(!fw.ok)return {ok:false,blocked:true,reason:fw.reason,gateId};
 const slotsPath=path.join(ROOT,'config','external-provider-slots-v30.json'); let slots=[]; try{slots=JSON.parse(fs.readFileSync(slotsPath,'utf8')).slots||[];}catch{return {ok:false,reason:'provider_slot_config_unreadable'};}
 const candidates=slots.filter(x=>x.service==='tts'&&x.enabled===true).sort((a,b)=>Number(a.slot)-Number(b.slot));
 const requested=String(language||'en-IN').toLowerCase();
 for(const slot of candidates){
   const coverage=slot.languageCodes||slot.verifiedLanguageCodes||[];
   if(Array.isArray(coverage)&&coverage.length&&!coverage.map(String).map(x=>x.toLowerCase()).includes(requested))continue;
   const endpoint=process.env[slot.endpointEnv||'']; const key=process.env[slot.credentialEnv||'']; if(!endpoint||!key)continue;
   const providerName=String(process.env[`${slot.id.toUpperCase()}_PROVIDER`]||slot.provider||'generic').toLowerCase();
   try{
     let r,data;
     if(providerName==='azure_speech'||slot.id==='tts_provider_01'){
       const voiceName=String(process.env[`${slot.id.toUpperCase()}_VOICE`]||voice||'');
       if(!voiceName)continue;
       const ssml=`<speak version="1.0" xml:lang="${requested}"><voice name="${voiceName}">${String(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</voice></speak>`;
       r=await fetch(endpoint,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'riff-24khz-16bit-mono-pcm'},body:ssml});
       if(!r.ok)continue; const buf=Buffer.from(await r.arrayBuffer()); if(buf.length<44)continue; const out=outputFile||path.join(c.outputDir,`kv30-azure-tts-${crypto.randomUUID()}.wav`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,buf);return {ok:true,provider:'azure_speech',language:requested,voice:voiceName,outputFile:out,externalGate:slot.gate};
     }
     r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({text:String(text||''),language:requested,voice:String(voice||'default'),pace:Number(pace)})});
     data=await r.json().catch(()=>({})); if(!r.ok)continue;
     const b64=data.audioBase64||data.audio||data.data; if(!b64)continue; const buf=Buffer.from(String(b64),'base64'); if(buf.length<44)continue; const out=outputFile||path.join(c.outputDir,`kv30-external-tts-${crypto.randomUUID()}.wav`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,buf);return {ok:true,provider:providerName,language:requested,outputFile:out,externalGate:slot.gate};
   }catch{}
 }
 return {ok:false,reason:'no_enabled_external_tts_provider_for_language',language:requested};
}
module.exports={config,providerStatus,languageCapability,normalizeLanguage,supportsEspeakLanguage,sarvamLanguageSupported,synthesize,synthesizeSarvam,synthesizeExternal};
