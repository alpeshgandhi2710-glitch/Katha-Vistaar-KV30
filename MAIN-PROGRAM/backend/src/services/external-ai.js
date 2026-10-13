'use strict';
const {requestJson}=require('../../../website-first/services/external-provider-adapter.js');
const providers={
 openai:{envKey:'OPENAI_API_KEY',modelEnv:'KV_OPENAI_MODEL',defaultModel:'gpt-5',endpoint:'https://api.openai.com/v1/responses'},
 gemini:{envKey:'GEMINI_API_KEY',modelEnv:'KV_GEMINI_MODEL',defaultModel:'gemini-3.7-flash',endpoint:'https://generativelanguage.googleapis.com/v1beta/interactions'},
 'openai-compatible':{envKey:'KV_EXTERNAL_OPENAI_COMPATIBLE_API_KEY',modelEnv:'KV_EXTERNAL_OPENAI_COMPATIBLE_MODEL',urlEnv:'KV_EXTERNAL_OPENAI_COMPATIBLE_URL',defaultModel:'local-compatible-model',endpoint:null}
};
function configured(id){const p=providers[id];if(!p)return false;if(id==='openai-compatible')return !!String(process.env[p.envKey]||'').trim()&&!!String(process.env[p.urlEnv]||'').trim();return !!String(process.env[p.envKey]||'').trim();}
function extractOpenAI(data){return String(data?.output_text||data?.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').filter(Boolean).join(' ')||'').trim();}
function extractGemini(data){return String(data?.steps?.flatMap(s=>s.content||[]).map(c=>c.text||'').filter(Boolean).join(' ')||data?.output_text||'').trim();}
async function generate({provider='auto',input,systemInstruction='',previousInteractionId=null}={}){
 const order=provider==='auto'?['openai','gemini','openai-compatible']:[provider];
 for(const id of order){const p=providers[id];if(!configured(id))continue;try{
  const key=process.env[p.envKey], model=process.env[p.modelEnv]||p.defaultModel;
  if(id==='openai-compatible'){const endpoint=String(process.env[p.urlEnv]||'').replace(/\/$/,'')+'/v1/chat/completions';const payload={model,messages:[{role:'system',content:systemInstruction||'You are a governed advisory model.'},{role:'user',content:String(input||'')}],temperature:0.4};const r=await requestJson({endpoint,apiKey:key,payload,timeoutMs:12000,retries:1});const text=String(r.data?.choices?.[0]?.message?.content||'').trim();if(text)return {ok:true,provider:id,model,text,rawId:r.data?.id||null};continue;}
  const payload=id==='openai'?{model,input:[{role:'developer',content:systemInstruction||'You are a governed advisory model. Never expose secrets or authorize privileged actions.'},{role:'user',content:String(input||'')}]}:{model,input:String(input||''),system_instruction:systemInstruction||'You are a governed advisory model. Never expose secrets or authorize privileged actions.',store:false,...(previousInteractionId?{previous_interaction_id:previousInteractionId}:{})};
  const r=await requestJson({endpoint:id==='gemini'?p.endpoint:p.endpoint,apiKey:key,payload,timeoutMs:12000,retries:1});
  const text=id==='openai'?extractOpenAI(r.data):extractGemini(r.data);
  if(text)return {ok:true,provider:id,model,text,rawId:r.data?.id||null};
 }catch(e){ /* fail closed to next provider/internal */ }
 }
 return {ok:false,mode:'internal_fallback',fallback:'internal_ai'};
}

async function healthCheck(provider='auto'){
 const order=provider==='auto'?['openai','gemini','openai-compatible']:[provider];
 for(const id of order){const p=providers[id];if(!configured(id))continue;try{
   const key=process.env[p.envKey];let endpoint=id==='openai'?'https://api.openai.com/v1/models':id==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models':String(process.env[p.urlEnv]||'').replace(/\/$/,'')+'/v1/models';
   const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),5000);const headers=id==='openai'?{Authorization:`Bearer ${key}`}:id==='gemini'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`};
   const r=await fetch(endpoint,{method:'GET',headers,signal:ac.signal});clearTimeout(timer);
   if(r.ok)return {ok:true,provider:id,status:r.status,model:process.env[p.modelEnv]||p.defaultModel};
 }catch{}
 }
 return {ok:false,reason:'external_provider_health_unavailable'};
}

function status(){return Object.fromEntries(Object.keys(providers).map(id=>[id,{configured:configured(id),model:process.env[providers[id].modelEnv]||providers[id].defaultModel,serverSideOnly:true,approvalGated:true,restrictedDataDefault:'DO_NOT_SEND'}]));}
module.exports={providers,configured,generate,healthCheck,status};
