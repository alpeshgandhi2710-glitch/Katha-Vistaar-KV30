'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const languageSupport=require('./ai-language-support.js');
const aiManagement=require('./ai-management.js');
const memory=require('./ai-memory-rag.js');
const evaluation=require('./ai-evaluation.js');
const runtime=require('./ai-internal-model-runtime.js');
const inference=require('./ai-internal-inference.js');
const VERSION='KV30-P2-30W-internal-intelligence-v1';
const ROOT=path.resolve(__dirname,'../../../website-first');
const creativeStyle=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-human-creative-style-v30.json'),'utf8'));}catch{return {directorContent:{},voiceProfiles:[]};}})();
const PROFILE_PATH=path.join(ROOT,'config','ai-intelligence-profiles-v30.json');
const runs=[];

const DEFAULT_PROFILE={
  goals:['understand the request','use only authorized context','produce a useful domain-correct result','self-check important claims','state uncertainty instead of inventing facts'],
  output:'natural_language',
  selfReview:true,
  maxReviewPasses:1,
  memoryScopes:['project','character','knowledge'],
  forbidden:['permission_bypass','secret_disclosure','self_elevation','self_deploy','unapproved_critical_change']
};

function profiles(){
  try{return JSON.parse(fs.readFileSync(PROFILE_PATH,'utf8'));}catch{return {version:VERSION,default:DEFAULT_PROFILE,ais:{}};}
}
function profileFor(aiId){
  const p=profiles();
  return {...DEFAULT_PROFILE,...(p.default||{}),...(p.ais?.[aiId]||{})};
}
function clean(v,max=9000){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').slice(0,max);}
function safeContext(context,profile){
  const c=context&&typeof context==='object'?context:{};
  const allowed=['actorRole','risk','language','workId','characterId','contentType','taskMode','expected','permissions','projectContext'];
  const out={};
  for(const k of allowed) if(c[k]!==undefined){
    if(k==='permissions') out[k]=Array.isArray(c[k])?c[k].slice(0,50).map(x=>clean(x,120)):[];
    else if(k==='expected') out[k]=clean(c[k],1000);
    else if(k==='projectContext') out[k]=clean(JSON.stringify(c[k]),6000);
    else out[k]=typeof c[k]==='string'?clean(c[k],300):c[k];
  }
  out.creativeDirection=creativeStyle.directorContent;
  out.voiceProfiles=creativeStyle.voiceProfiles;
  out.allowedMemoryScopes=(profile.memoryScopes||[]).filter(x=>['project','user','character','knowledge'].includes(x));
  return out;
}
function retrieve(aiId,input,context,profile){
  const userId=context?.userId||null;
  const scopes=(profile.memoryScopes||[]).filter(x=>['project','user','character','knowledge'].includes(x));
  return scopes.flatMap(scope=>{const owner=scope==='user'?userId:(scope==='project'?context?.projectId:context?.characterId);if(scope!=='knowledge'&&!owner)return [];return memory.search(scope,input,5,owner).map(x=>({...x,scope,aiId}));}).slice(0,16);
}
function riskOf(context,input){
  const r=String(context?.risk||'').toLowerCase();
  if(['critical','high'].includes(r)) return r;
  return /(password|otp|private\s*key|recovery\s*key|secret|credential|bank|pan|payment|refund|chargeback|permission|role|deploy|delete|deactivate|reactivate|security)/i.test(input)?'high':'low';
}
function constitutionText(aiId){
  const p=path.join(ROOT,'config','ai-constitutions-v30.json');
  try{return JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')).roles?.[aiId]||{});}catch{return '{}';}
}
function systemTask(profile,aiId,task,language,risk){
  return [
    `You are the ${aiId} specialist inside Katha Vistaar.`,
    `Task: ${clean(task||'general',500)}.`,
    `Language: ${language}.`,
    `Risk: ${risk}.`,
    `Goals: ${(profile.goals||[]).join('; ')}.`,
    `Required output: ${profile.output||'natural_language'}.`,
    `Domain constitution: ${constitutionText(aiId)}.`,
    `Never disclose secrets, bypass authorization, self-elevate, self-deploy, approve critical actions, or invent unavailable facts.`,
    `When context is insufficient, ask for the minimum missing information or clearly state uncertainty.`,
    `For creative work, preserve canonical facts supplied in authorized context and flag contradictions rather than silently changing them.`,
    `For human-directed content, understand emotion, subtext, relationships, social and cultural context; show feelings through natural action, dialogue, silence and detail rather than generic emotional labels. Avoid stereotypes and artificial moralizing.`,
    `When a voice profile is requested, vary tone, pace, rhythm, emphasis and emotional delivery while preserving the selected language and character identity.`,
    `For analysis, distinguish evidence, inference and recommendation.`,
    `For critical/high-risk requests, produce advice/proposal only; do not claim that a real-world action was applied.`
  ].join('\n');
}
function reviewPrompt(aiId,task,language,draft,context){
  return `Act as the internal Quality/Safety reviewer for ${aiId}. Review this draft for task correctness, instruction following, factual/creative consistency, missing context, unauthorized claims, secret leakage, and language quality.\nTask: ${clean(task,500)}\nLanguage: ${language}\nAuthorized context: ${clean(JSON.stringify(context),5000)}\nDraft:\n${clean(draft,14000)}\nReturn a concise review with: verdict (PASS/REVISE/BLOCK), issues, corrections, and whether a revised answer is needed. Do not invent facts.`;
}
function revisionPrompt(aiId,task,language,draft,review){
  return `Revise the draft using the reviewer findings. Preserve correct content, fix only identified issues, obey Katha Vistaar authority/safety rules, and answer naturally in ${language}. Do not mention this review process.\nAI: ${aiId}\nTask: ${clean(task,500)}\nDraft:\n${clean(draft,14000)}\nReview:\n${clean(review,7000)}`;
}
function basicContract(aiId,task,input,context){
  const base=inference.infer({aiId,task,input,context,memory:[]});
  return base;
}

async function execute({aiId='ai_orchestrator',task='general',input='',context={},forceReview=null}={}){
  const id=String(aiId).trim();
  if(!aiManagement.roles[id]) throw Object.assign(new Error('ai_role_not_registered'),{code:'ai_role_not_registered'});
  if(!String(input||'').trim()) throw Object.assign(new Error('ai_input_required'),{code:'ai_input_required'});
  const p=profileFor(id);
  const lang=languageSupport.resolve(context.language,input).code;
  const risk=riskOf(context,input);
  const scopedContext=safeContext({...context,language:lang},p);
  const retrieved=retrieve(id,input,context,p);
  const contract=basicContract(id,task,input,{...scopedContext,risk,language:lang});
  const started=Date.now();
  const model=await runtime.generate({
    aiId:id,task,input,language:lang,memory:retrieved,
    context:{...scopedContext,risk,language:lang},
    constitution:systemTask(p,id,task,lang,risk)
  });
  let text=model.ok?model.text:null;
  const reviewEnabled=forceReview===null?p.selfReview!==false:Boolean(forceReview);
  const reviewPasses=Math.max(0,Math.min(2,Number(p.maxReviewPasses??1)));
  const reviews=[];
  if(model.ok && reviewEnabled && reviewPasses>0 && String(text).length>20){
    for(let i=0;i<reviewPasses;i++){
      const rv=await runtime.generate({aiId:'quality_ai',task:'self_review',input:reviewPrompt(id,task,lang,text,scopedContext),language:lang,memory:retrieved,context:{actorRole:'internal',risk:'low',reviewOf:id},constitution:systemTask(p,'quality_ai','self-review',lang,'low')});
      if(!rv.ok){reviews.push({pass:i+1,ok:false,reason:rv.reason||'review_runtime_failed'});break;}
      reviews.push({pass:i+1,ok:true,text:rv.text});
      const verdict=/\bBLOCK\b/i.test(rv.text)?'BLOCK':/\bREVISE\b/i.test(rv.text)?'REVISE':'PASS';
      if(verdict==='BLOCK'){text=null;break;}
      if(verdict==='REVISE'){
        const revised=await runtime.generate({aiId:id,task:'reviewed_revision',input:revisionPrompt(id,task,lang,text,rv.text),language:lang,memory:retrieved,context:{...scopedContext,risk,language:lang},constitution:systemTask(p,id,'reviewed revision',lang,risk)});
        if(revised.ok)text=revised.text;else reviews.push({pass:i+1,revisionFailed:true,reason:revised.reason||'revision_runtime_failed'});
      }else break;
    }
  }
  const output=text||contract.result;
  const outputText=typeof output==='string'?output:JSON.stringify(output);
  const safety=evaluation.evaluate({aiId:id,task,input,output:outputText,expected:context.expected});
  const row={id:crypto.randomUUID(),version:VERSION,aiId:id,task,inputLength:String(input).length,language:lang,risk,modelAvailable:model.ok,selfReview:reviewEnabled,reviews:reviews.map(x=>({...x,text:x.text?String(x.text).slice(0,12000):undefined})),quality:safety.pass,latencyMs:Date.now()-started,createdAt:new Date().toISOString()};
  runs.push(row);if(runs.length>1000)runs.shift();
  return {ok:true,aiId:id,task,language:lang,risk,provider:model.ok?model.provider:'internal-contract',model:model.model||inference.CONTRACT.modelId,modelExecution:{ok:model.ok,reason:model.ok?null:model.reason||null},memory:retrieved,contractFallback:contract.result,naturalLanguage:model.ok?text:null,finalOutput:output,review:{enabled:reviewEnabled,passes:reviews.length,details:reviews},quality:{pass:safety.pass,id:safety.id},runId:row.id};
}
function status(){return {version:VERSION,profiles:Object.keys(profiles().ais||{}).length,defaultSelfReview:DEFAULT_PROFILE.selfReview,runs:runs.length,localModelRequiredForNaturalLanguage:true,contractFallbackAvailable:true};}
module.exports={VERSION,profiles,profileFor,riskOf,execute,status,runs};
