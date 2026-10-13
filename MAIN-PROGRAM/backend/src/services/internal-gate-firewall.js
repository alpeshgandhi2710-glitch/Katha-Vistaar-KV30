'use strict';
const external=require('./external-gate-firewall.js');
const fs=require('node:fs');
const path=require('node:path');
const AI_GATE_FILE=path.resolve(__dirname,'../../../website-first/config/internal-ai-gate-configuration-v30.json');
let AI_CONFIG={gates:[]};
try{AI_CONFIG=JSON.parse(fs.readFileSync(AI_GATE_FILE,'utf8'));}catch(e){throw new Error(`internal_ai_gate_config_unreadable:${e.message}`);}
const aiGates=new Map((AI_CONFIG.gates||[]).map(x=>[String(x.aiId),x]));
function authorizeInternal({gateId,serviceId=null,aiId=null}={}){const id=String(gateId||'');const ag=aiId?aiGates.get(String(aiId)):null;if(ag){if(ag.gate!==id)return {ok:false,blocked:true,reason:'internal_ai_gate_authority_mismatch',gateId:id,aiId:String(aiId)};if(ag.enabled!==true)return {ok:false,blocked:true,reason:'internal_ai_gate_disabled',gateId:id,aiId:String(aiId)};return {ok:true,gateId:id,aiId:String(aiId),serviceId:null,firewall:'internal_passed',internalLayer:'always_on',externalNotRequired:true};}const g=external.gate(id);if(!g)return {ok:false,blocked:true,reason:'unknown_gate',gateId:id};if(serviceId!==null&&g.service&&String(g.service)!==String(serviceId))return {ok:false,blocked:true,reason:'service_gate_authority_mismatch',gateId:id};return {ok:true,gateId:id,serviceId:g.service||serviceId||null,firewall:'internal_passed',internalLayer:'always_on',externalNotRequired:true};}
function authorizeExternal(args={}){return external.authorize(args);}
function status(){return {internalFirewall:'enabled',externalFirewall:'enabled',internalAlwaysOn:true,internalAIGateCount:aiGates.size,internalAIGates:[...aiGates.values()],externalDefaultFailClosed:true,external:external.status()};}
function aiGateFor(aiId){const x=aiGates.get(String(aiId||''));return x?{...x}:null;}
function listInternalAIGates(){return [...aiGates.values()].map(x=>({...x}));}
module.exports={authorizeInternal,authorizeExternal,status,aiGateFor,listInternalAIGates};
