'use strict';
const crypto=require('node:crypto');
const path=require('node:path');
const fs=require('node:fs');
const firewall=require('../../backend/src/services/external-gate-firewall.js');
const adapter=require('./comic-lora-provider-adapter.js');
const CONFIG=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','comic-lora-external-service-v30.json'),'utf8'));
function createComicLoraService({services,env=process.env}={}){
 if(!services)throw new Error('comic_lora_service_manager_required');
 const endpoint=()=>String(env.KV_COMIC_LORA_ENDPOINT||'').trim();
 const apiKey=()=>String(env.KV_COMIC_LORA_API_KEY||'').trim();
 const internalFallback=(input,reason)=>({mode:'internal_character_comic_continuity',reason,characterId:String(input?.characterId||''),prompt:String(input?.prompt||''),continuity:{characterFacts:'internal_character_ai',visualContinuity:'internal_comic_ai',approvalRequired:true,canGenerateImages:false}});
 function extraGate(gateId,input,idempotencyKey){
   return firewall.authorize({gateId,serviceId:'comic_lora',externalEnabled:true,serviceSwitchActive:services.capability('comic_lora').enabled===true,actor:'master_admin',input,idempotencyKey,timeoutMs:CONFIG.polling.timeoutMs});
 }
 async function generate(input={}){
   const serviceCap=services.capability('comic_lora');
   if(!serviceCap.enabled)return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,'external_service_off'),fallback:true};
   const characterId=String(input.characterId||'').trim();
   const prompt=String(input.prompt||input.scene||'').trim();
   const loraName=String(input.loraName||'').trim();
   const rights=input.rights||{};
   if(!characterId||!prompt||!loraName)return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,'required_input_missing'),fallback:true,error:'comic_lora_required_input'};
   const idempotencyKey=String(input.idempotencyKey||`comic-lora:${characterId}:${crypto.createHash('sha256').update(prompt+'|'+loraName).digest('hex').slice(0,24)}`);
   try{
     const inbound=extraGate(CONFIG.inboundGate,JSON.stringify({characterId,prompt,loraName,referenceCount:Array.isArray(input.referenceAssets)?input.referenceAssets.length:0}),idempotencyKey+':in');
     if(!inbound.ok)return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,inbound.reason),fallback:true,firewall:inbound};
     adapter.validateRights(rights);
     const rightsGate=extraGate(CONFIG.rightsGate,JSON.stringify({characterId,rightsApproved:true,referenceAssetApproved:true,externalDataApproved:true}),idempotencyKey+':rights');
     if(!rightsGate.ok)return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,rightsGate.reason),fallback:true,firewall:rightsGate};
     const validated=adapter.validateWorkflow(input.workflow,loraName);
     const primary=await services.safeCallAsync('comic_lora',()=>adapter.submit({endpoint:endpoint(),apiKey:apiKey(),workflow:validated.workflow,clientId:String(input.clientId||`kv30-${characterId}`),promptId:input.promptId,timeoutMs:CONFIG.polling.timeoutMs}),internalFallback(input,'external_submission_failed'),{actor:'master_admin',input:JSON.stringify({characterId,prompt,loraName}),memoryTarget:null,idempotencyKey});
     if(!primary.ok)return {...primary,fallback:true};
     const out=primary.value;
     const outbound=extraGate(CONFIG.outboundGate,JSON.stringify({providerJobId:out.providerJobId,queue:out.queue}),idempotencyKey+':out');
     if(!outbound.ok)return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,outbound.reason),fallback:true,firewall:outbound};
     return {ok:true,mode:'external_comfyui',layer:'external',provider:adapter.CONFIG.provider,providerJobId:out.providerJobId,queue:out.queue,nodeErrors:out.nodeErrors||null,governance:{masterAdminControlled:true,externalAuthoritative:false,internalFallback:'available'},workflow:{loraName,characterId},statusPath:'/api/comic/lora/status'};
   }catch(error){
     firewall.recordFailure(CONFIG.primaryGate,String(error.message||error));
     return {ok:false,mode:'internal_fallback',layer:'internal',value:internalFallback(input,error.code||'external_execution_failed'),fallback:true,error:error.code||'comic_lora_external_failed'};
   }
 }
 async function status(promptId){
   const id=String(promptId||'').trim();if(!id)return {ok:false,error:'prompt_id_required'};
   if(!services.capability('comic_lora').enabled)return {ok:false,mode:'internal_fallback',fallback:true,reason:'external_service_off'};
   try{
     const h=await adapter.history({endpoint:endpoint(),apiKey:apiKey(),promptId:id,timeoutMs:8000});
     const row=h.history||{};
     const failed=row.status?.status_str==='error'||row.status?.status_str==='failed';
     const completed=row.status?.completed===true||row.status?.status_str==='success'||!!row.outputs;
     const outputs=completed?adapter.outputSummary(row):[];
     if(completed){const outGate=extraGate(CONFIG.outboundGate,JSON.stringify({promptId:id,outputs}),`comic-lora-status:${id}:out`);if(!outGate.ok)return {ok:false,mode:'internal_fallback',fallback:true,reason:outGate.reason,fallbackPlan:internalFallback({promptId:id},outGate.reason)};}
     return {ok:true,mode:failed?'external_failed':completed?'external_complete':'external_running',promptId:id,completed,failed,outputs,fallback:failed?internalFallback({promptId:id},'external_job_failed'):null};
   }catch(error){return {ok:false,mode:'internal_fallback',fallback:true,reason:error.code||'external_status_failed',fallbackPlan:internalFallback({promptId:id},error.code||'external_status_failed')};}
 }
 return {config:CONFIG,generate,status,capability:()=>services.capability('comic_lora')};
}
module.exports={createComicLoraService,CONFIG};
