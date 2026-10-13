'use strict';
const external=require('./external-ai.js');
const firewall=require('./external-gate-firewall.js');
const providerPolicy=require('./ai-provider-policy.js');
const SENSITIVE=/(password|otp|secret|private.?key|recovery.?key|product.?key|bank|pan|ifsc|credential|royalty|unpublished|private profile)/i;
function sanitize(input){const text=String(input||'').slice(0,6000);if(SENSITIVE.test(text))return {allowed:false,reason:'restricted_data_default'};return {allowed:true,input:text.replace(/\b(?:api[_-]?key|token)\s*[:=]\s*[^\s,;]+/ig,'[REDACTED]')};}
function validateOutput(result){
 const text=String(result?.text||'').trim();
 if(!result?.ok)return {ok:false,reason:'external_provider_failed'};
 if(!text)return {ok:false,reason:'external_empty_output'};
 if(text.length>50000)return {ok:false,reason:'external_output_too_large'};
 if(SENSITIVE.test(text))return {ok:false,reason:'external_output_restricted_data'};
 return {ok:true,text};
}
async function execute({provider='auto',input,approved=false,usageMode='fallback',gateId='gate_75',actor='master_admin',memoryTarget='externalProjectMemoryBoundaryGate',idempotencyKey=''}={}){
 if(!approved)return {ok:false,blocked:true,reason:'external_ai_approval_required'};
 const safe=sanitize(input);
 if(!safe.allowed)return {ok:false,blocked:true,reason:safe.reason};
 const policyEnabled=providerPolicy.status().external?.enabled===true;
 if(!policyEnabled)return {ok:false,blocked:true,reason:'external_layer_off',gateId};
 const fw=firewall.authorize({gateId,externalEnabled:true,serviceSwitchActive:policyEnabled,actor,input:safe.input,memoryTarget,idempotencyKey:idempotencyKey||`ai:${gateId}:${Date.now()}`});
 if(!fw.ok)return fw;if(!safe.allowed)return {ok:false,blocked:true,reason:safe.reason};
 const r=await external.generate({provider,input:safe.input,systemInstruction:'Katha Vistaar external advisory layer only. Do not authorize actions, reveal secrets, alter permissions, or change production state.'});
 const validation=validateOutput(r);
 if(!validation.ok)return {...r,ok:false,blocked:true,reason:validation.reason,usageMode,dataFirewall:'passed',validated:false};
 return {...r,ok:true,text:validation.text,usageMode,dataFirewall:'passed',validated:true,validation:'output_safety_basic',externalGate:gateId,privateProjectMemoryBoundary:'enforced'};
}
function status(){return {...external.status(),gateway:'enabled',defaultPolicy:'approval_gated',restrictedDataDefault:'DO_NOT_SEND',outputValidation:true,firewall:firewall.status()};}
module.exports={sanitize,validateOutput,execute,status};
