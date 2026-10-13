'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../website-first');
const FILE=path.join(ROOT,'config','external-gate-configuration-profile-v30.json');
let CONFIG;
try{CONFIG=JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(e){throw new Error(`external_gate_config_unreadable:${e.message}`);}
const nonAi=new Map((CONFIG.nonAi||[]).map(x=>[x.gate,x]));
const ai=new Map((CONFIG.aiSpecialist||[]).map(x=>[x.gate,x]));
const memory=new Map((CONFIG.projectMemory||[]).map(x=>[x.id,x]));
const SLOT_FILE=path.join(ROOT,'config','external-provider-slots-v30.json');
let SLOT_CONFIG={slots:[]};try{SLOT_CONFIG=JSON.parse(fs.readFileSync(SLOT_FILE,'utf8'));}catch{}
const providerSlots=new Map((SLOT_CONFIG.slots||[]).map(x=>[x.gate,x]));
const providerAlternate=new Map((CONFIG.providerAlternate||[]).map(x=>[x.gate,x]));
const CAPABILITY_FILE=path.join(ROOT,'config','external-capability-gates-v30.json');
let CAPABILITY_CONFIG={gates:[]};try{CAPABILITY_CONFIG=JSON.parse(fs.readFileSync(CAPABILITY_FILE,'utf8'));}catch{}
const capability=new Map((CAPABILITY_CONFIG.gates||[]).map(x=>[x.gate,x]));
const audit=[];
function clean(v,max=2000){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);}
function hash(v){return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,16);}
function isMasterAdmin(actor){return String(actor||'')==='master_admin';}
function gate(gateId){return nonAi.get(String(gateId||''))||ai.get(String(gateId||''))||providerAlternate.get(String(gateId||''))||providerSlots.get(String(gateId||''))||capability.get(String(gateId||''))||null;}
function checkInput(input){
 const text=clean(input,6000);
 if(/(?:^|\b)(?:api[_-]?key|secret|password|recovery[_-]?key|product[_-]?key|private[_-]?key|otp)\s*[:=]/i.test(text))return {ok:false,reason:'credential-secret-redaction'};
 if(/(?:\.\.|;\s*(?:rm|del|powershell)|`|\$\(|<script|javascript:)/i.test(text))return {ok:false,reason:'path-and-command-injection-filter'};
 return {ok:true,input:text};
}
function authorize({gateId,serviceId=null,externalEnabled=false,serviceSwitchActive=false,actor='master_admin',input='',memoryTarget=null,idempotencyKey='',timeoutMs=12000,direction='both'}={}){
 const g=gate(gateId);
 if(!g)return deny('unknown_gate',gateId);
 const dir=String(direction||'both');
 if(!['inbound','outbound','both'].includes(dir))return deny('firewall_direction_invalid',gateId);
 if(dir!=='outbound' && g.inboundFirewall===false)return deny('inbound_firewall_missing',gateId);
 if(dir!=='inbound' && g.outboundFirewall===false)return deny('outbound_firewall_missing',gateId);
 if(!externalEnabled)return deny('external_layer_off',gateId);
 if(!isMasterAdmin(actor))return deny('master_admin_required',gateId);
 if(g.mode==='internal_only')return deny('internal_only_gate',gateId);
 if(g.enabled!==true && serviceSwitchActive!==true)return deny('external_gate_switch_off',gateId);
 if(serviceId!==null && g.service && String(g.service)!==String(serviceId))return deny('service_gate_authority_mismatch',gateId);
 if(g.providerSlotId){
   const slot=providerSlots.get(String(g.providerSlotId));
   if(!slot)return deny('provider_slot_not_found',gateId);
   if(slot.enabled!==true)return deny('provider_slot_switch_off',gateId);
 }
 const safe=checkInput(input);if(!safe.ok)return deny(safe.reason,gateId);
 if(memoryTarget){const aliases={externalLearningInboxGate:'service_gate_tts_memory_ingest',internalAIMemoryPromotionGate:'service_gate_tts_memory_promotion',externalProjectMemoryBoundaryGate:'service_gate_tts_memory_export'};const resolved=aliases[String(memoryTarget)]||String(memoryTarget);const m=memory.get(resolved);if(!m)return deny('unknown_memory_boundary',gateId);if(m.requiresExternalLayer!==true)return deny('memory_boundary_not_external_gated',gateId);}
 if(!Number.isFinite(Number(timeoutMs))||Number(timeoutMs)<100||Number(timeoutMs)>120000)return deny('timeout_budget_invalid',gateId);
 if(!String(idempotencyKey||'').trim())return deny('idempotency_key_required',gateId);
 return {ok:true,gateId:String(gateId),input:safe.input,firewall:'passed',firewallDirection:dir,authoritativeExternal:false};
}

function authorizeTwoSided(args={}){
 const inbound=authorize({...args,direction:'inbound'});
 if(!inbound.ok)return {ok:false,phase:'inbound',inbound};
 const outbound=authorize({...args,direction:'outbound'});
 if(!outbound.ok)return {ok:false,phase:'outbound',inbound,outbound};
 return {ok:true,phase:'both',inbound,outbound,firewall:'two_sided_passed'};
}

function deny(reason,gateId){const event={at:new Date().toISOString(),gateId:String(gateId||''),result:'deny',reason:String(reason),eventId:hash(`${Date.now()}:${gateId}:${reason}:${Math.random()}`)};audit.push(event);if(audit.length>500)audit.shift();return {ok:false,blocked:true,reason,gateId:String(gateId||''),auditEventId:event.eventId};}
function recordFailure(gateId,reason){const event={at:new Date().toISOString(),gateId:String(gateId||''),result:'failure',reason:clean(reason,300),eventId:hash(`${Date.now()}:${gateId}:${reason}:${Math.random()}`)};audit.push(event);if(audit.length>500)audit.shift();return event;}
function status(){const providerServiceClassCount=new Set([...providerAlternate.values()].map(x=>x.service).filter(Boolean)).size;return {version:CONFIG.version,canonicalPrimaryGateCount:nonAi.size+ai.size,nonAiGateCount:nonAi.size,aiSpecialistGateCount:ai.size,projectMemoryGateCount:memory.size,totalGovernedGateRecords:nonAi.size+ai.size+memory.size,providerServiceClassCount,providerAlternateGateCount:providerAlternate.size,externalCapabilityGateCount:capability.size,externalCapabilityGateIds:[...capability.keys()],firewallChecks:CONFIG.firewallChecks,defaultFailClosed:true,internalAlwaysOn:true,externalMasterAdminControlled:true,auditEvents:audit.length};}
function list(){return {nonAi:[...nonAi.values()],aiSpecialist:[...ai.values()],projectMemory:[...memory.values()],providerAlternate:[...providerAlternate.values()],externalCapability:[...capability.values()]};}
module.exports={authorize,authorizeTwoSided,recordFailure,status,list,gate,CONFIG};
