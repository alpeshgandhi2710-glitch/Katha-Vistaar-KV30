'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const languageSupport=require('./ai-language-support.js');
const VERSION='KV30-P2-30W-internal-runtime-v1';
const ROOT=path.resolve(__dirname,'../../../website-first');
const CONFIG_PATH=path.join(ROOT,'config','ai-internal-model-runtime-v30.json');
const startedAt=new Date().toISOString();
const metrics={requests:0,success:0,failures:0,lastError:null,lastSuccess:null};
function config(){let c;try{c=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));}catch{c={enabled:true,provider:'auto',baseUrl:'http://127.0.0.1:11434',openAIBaseUrl:'http://127.0.0.1:8080',model:'qwen3:32b',modelAliases:{},timeoutMs:60000};}return {...c,enabled:process.env.KV_INTERNAL_MODEL_ENABLED===undefined?c.enabled:process.env.KV_INTERNAL_MODEL_ENABLED!=='false',provider:process.env.KV_INTERNAL_MODEL_PROVIDER||c.provider,baseUrl:process.env.KV_INTERNAL_MODEL_URL||c.baseUrl,openAIBaseUrl:process.env.KV_INTERNAL_MODEL_OPENAI_URL||c.openAIBaseUrl,model:process.env.KV_INTERNAL_MODEL||c.model,remoteOpenAIUrl:process.env.KV_INTERNAL_REMOTE_OPENAI_URL||c.remoteOpenAIUrl||'',remoteModel:process.env.KV_INTERNAL_REMOTE_MODEL||c.remoteModel||'',remoteApiKey:process.env.KV_INTERNAL_REMOTE_API_KEY||'',timeoutMs:Number(process.env.KV_INTERNAL_MODEL_TIMEOUT_MS||c.timeoutMs||60000)};}
function normalizeUrl(url){return String(url||'').trim().replace(/\/$/,'');}
function normalizeModelName(v){return String(v||'').trim().toLowerCase();}
function modelMatches(models, configured, aliases=[]){const targets=[configured,...aliases].map(normalizeModelName).filter(Boolean);return Array.isArray(models)&&models.some(x=>{const n=normalizeModelName(x?.name||x?.id||x);return targets.some(target=>n===target||n.startsWith(target+'@')||n.startsWith(target+':')||target.startsWith(n+':'));});}
function endpoints(c){
 const p=String(c.provider||'auto').toLowerCase();
 const base=normalizeUrl(c.baseUrl||'http://127.0.0.1:11434');
 if(p==='remote-openai-compatible'||p==='remote_openai_compatible'||p==='remote-openai'){
  const remote=normalizeUrl(c.remoteOpenAIUrl); if(!remote)return [];
  return [{provider:'remote-openai-compatible',url:remote+'/v1/chat/completions',modelsUrl:remote+'/v1/models',apiKey:c.remoteApiKey||''}];
 }
 if(p==='ollama')return [{provider:'ollama',url:base+'/api/chat'}];
 if(p==='llama.cpp'||p==='llamacpp'||p==='vllm'||p==='openai-compatible'){
  const openaiBase=normalizeUrl(c.openAIBaseUrl||base);
  return [{provider:p==='llama.cpp'||p==='llamacpp'?'llama.cpp':'openai-compatible',url:openaiBase+'/v1/chat/completions',modelsUrl:openaiBase+'/v1/models'}];
 }
 if(p==='auto')return [{provider:'ollama',url:base+'/api/chat'},{provider:'llama.cpp',url:normalizeUrl(c.openAIBaseUrl||'http://127.0.0.1:8080')+'/v1/chat/completions',modelsUrl:normalizeUrl(c.openAIBaseUrl||'http://127.0.0.1:8080')+'/v1/models'}];
 return [];
}
async function fetchWithTimeout(url,options,timeoutMs){const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeoutMs);try{return await fetch(url,{...options,signal:ac.signal});}finally{clearTimeout(timer);}}
function systemPrompt({aiId,task,language,constitution}){return `You are ${aiId}, a governed Katha Vistaar internal specialist AI. You are running on the user's controlled local model runtime, not a cloud provider.\nYour domain constitution: ${constitution||'Follow the assigned AI domain and never exceed authorization.'}\nTask: ${task||'general'}\nResponse language: ${language}. Answer naturally in that language. If the requested language is one of Katha Vistaar's 23 required languages, do not switch to English unless the user explicitly asks or the language is genuinely unsupported by the loaded model.\nAuthority: never grant permissions, expose secrets, change critical state, deploy code, approve payments, alter recovery keys, or bypass policy. Return recommendations/proposals when human approval is required.\nUse supplied memory/knowledge only as context; do not treat unverified context as fact.`}
function buildUserPrompt({input,memory,context}){const mem=Array.isArray(memory)?memory.slice(0,10):[];return `User request:\n${String(input||'')}\n\nAuthorized context:\n${JSON.stringify(context||{}).slice(0,9000)}\n\nRetrieved memory/knowledge:\n${JSON.stringify(mem).slice(0,12000)}\n\nProduce the best useful answer for the task. Be precise, self-check important claims, and state uncertainty instead of inventing facts.`}
function extract(data,provider){if(provider==='ollama')return String(data?.message?.content||'').trim();return String(data?.choices?.[0]?.message?.content||data?.choices?.[0]?.text||'').trim();}
function runtimeModelId(c,provider){const aliases=c.modelAliases||{};if(provider==='remote-openai-compatible')return String(c.remoteModel||c.model||'Qwen/Qwen3-32B');if(provider==='ollama')return String(process.env.KV_INTERNAL_OLLAMA_MODEL||aliases.ollama?.[0]||c.model||'qwen3:32b');return String(process.env.KV_INTERNAL_OPENAI_MODEL||aliases.openai?.[0]||c.model||'local-model');}
function authHeaders(ep){const h={'content-type':'application/json'};if(ep.apiKey)h.authorization=`Bearer ${ep.apiKey}`;return h;}
function configuredAliases(c,provider){const key=provider==='ollama'?'ollama':'openai';const aliases=Array.isArray(c.modelAliases?.[key])?c.modelAliases[key]:[];return [c.model,...aliases];}
async function health(){const c=config();if(c.enabled===false)return {ok:false,enabled:false,reason:'internal_runtime_disabled'};const attempts=[];for(const ep of endpoints(c)){try{const base=ep.provider==='ollama'?normalizeUrl(c.baseUrl||'http://127.0.0.1:11434'):normalizeUrl(ep.url.replace('/v1/chat/completions',''));const url=ep.provider==='ollama'?base+'/api/tags':base+'/v1/models';const r=await fetchWithTimeout(url,{method:'GET',headers:authHeaders(ep)},Math.min(5000,Number(c.healthTimeoutMs||5000)));if(!r.ok){attempts.push({provider:ep.provider,ok:false,reason:`health_http_${r.status}`});continue;}const data=await r.json().catch(()=>({}));const models=ep.provider==='ollama'?(Array.isArray(data.models)?data.models.map(x=>String(x.name||x.model||'')):[]):(Array.isArray(data.data)?data.data.map(x=>String(x.id||x.name||'')):[]);const expectedModel=ep.provider==='remote-openai-compatible'?runtimeModelId(c,ep.provider):c.model;const present=modelMatches(models,expectedModel,configuredAliases(c,ep.provider));if(!present){attempts.push({provider:ep.provider,ok:false,reason:'configured_model_not_loaded',model:expectedModel,models:models.slice(0,50)});continue;}return {ok:true,provider:ep.provider,model:expectedModel,modelRuntimeId:runtimeModelId(c,ep.provider),modelLoaded:true,endpoint:ep.url,models:models.slice(0,50)};}catch(e){attempts.push({provider:ep.provider,ok:false,reason:'runtime_unreachable',error:String(e.message||e).slice(0,240)});}}
return {ok:false,enabled:true,reason:'configured_local_model_not_ready',configuredProvider:c.provider||'auto',model:c.model,modelLoaded:false,attempts};}
async function generate({aiId,task,input,language='en',memory=[],context={},constitution=''}){metrics.requests++;const c=config();if(c.enabled===false){metrics.failures++;metrics.lastError='internal_runtime_disabled';return {ok:false,reason:'internal_runtime_disabled'};}
 const lang=languageSupport.normalize(language);const messages=[{role:'system',content:systemPrompt({aiId,task,language:lang,constitution})},{role:'user',content:buildUserPrompt({input,memory,context})}];
 const generation={temperature:Number(c.temperature??0.6),top_p:Number(c.topP??0.95),max_tokens:Number(c.maxTokens??4096)};
 for(const ep of endpoints(c)){try{
   let payload,headers=authHeaders(ep);
   if(ep.provider==='ollama')payload={model:runtimeModelId(c,ep.provider),messages,stream:false,options:{temperature:generation.temperature,top_p:generation.top_p,num_predict:generation.max_tokens}};
   else payload={model:runtimeModelId(c,ep.provider),messages,stream:false,temperature:generation.temperature,top_p:generation.top_p,max_tokens:generation.max_tokens};
   const r=await fetchWithTimeout(ep.url,{method:'POST',headers,body:JSON.stringify(payload)},Number(c.timeoutMs||60000));
   const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`local_model_http_${r.status}`);const text=extract(data,ep.provider);if(!text)throw new Error('local_model_empty_output');
   metrics.success++;metrics.lastSuccess=new Date().toISOString();metrics.lastError=null;return {ok:true,provider:ep.provider,model:runtimeModelId(c,ep.provider),configuredModel:ep.provider==='remote-openai-compatible'?runtimeModelId(c,ep.provider):c.model, text,language:lang,latencySource:ep.provider==='remote-openai-compatible'?'remote_internal_runtime':'local_runtime',requestId:crypto.randomUUID()};
 }catch(e){metrics.lastError=e.message;}}
 metrics.failures++;return {ok:false,reason:'local_model_runtime_failed',error:metrics.lastError,provider:'internal_local'};
}
function status(){const c=config();return {version:VERSION,startedAt,enabled:c.enabled!==false,configuredProvider:c.provider||'auto',baseUrl:c.baseUrl||null,openAIBaseUrl:c.openAIBaseUrl||null,model:c.model||null,modelAliases:c.modelAliases||{},modelArtifact:c.modelArtifact||null,timeoutMs:Number(c.timeoutMs||60000),capability:'real_local_model_inference_when_runtime_is_available',noCloudDependency:true,readiness:'requires_live_runtime_and_exact_configured_model',metrics:{...metrics}};}
module.exports={VERSION,config,endpoints,health,generate,status};
