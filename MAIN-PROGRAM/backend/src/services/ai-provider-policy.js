'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../website-first');
const FILE=path.join(ROOT,'data','ai-provider-policy.json');
const DEFAULT={version:'KV30-P2-30W-provider-policy-v1',internal:{enabled:true,required:true,first:true},external:{enabled:false,approvalRequired:true,failoverOnly:false,provider:'auto',providers:['openai','gemini','openai-compatible'],billingMode:'public',allowedBillingModes:['free','paid','public'],taskRouting:'master_admin_defined',perAI:{},usageLimits:{maxRequestsPerDay:0,maxTokensPerRequest:4096,maxCostPerDay:0,currency:'USD'} },updatedAt:null,updatedBy:null};
function read(){try{const saved=JSON.parse(fs.readFileSync(FILE,'utf8'));return {...DEFAULT,...saved,internal:{...DEFAULT.internal,...(saved.internal||{})},external:{...DEFAULT.external,...(saved.external||{}),providers:Array.isArray(saved.external?.providers)?saved.external.providers:DEFAULT.external.providers,allowedBillingModes:Array.isArray(saved.external?.allowedBillingModes)?saved.external.allowedBillingModes:DEFAULT.external.allowedBillingModes,perAI:saved.external?.perAI&&typeof saved.external.perAI==='object'?saved.external.perAI:{},usageLimits:{...DEFAULT.external.usageLimits,...(saved.external?.usageLimits||{})}}};}catch{return {...DEFAULT,internal:{...DEFAULT.internal},external:{...DEFAULT.external}};}
}
function write(next,actor='master_admin'){const value={...DEFAULT,...next,updatedAt:new Date().toISOString(),updatedBy:actor,changeId:crypto.randomUUID()};fs.mkdirSync(path.dirname(FILE),{recursive:true});const tmp=FILE+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n','utf8');fs.renameSync(tmp,FILE);return value;}
function assertMaster(actor){if(String(actor)!=='master_admin')throw Object.assign(new Error('master_admin_required'),{code:'master_admin_required'});}
function setExternalEnabled(enabled,actor='master_admin'){assertMaster(actor);return write({...read(),external:{...read().external,enabled:Boolean(enabled)}},actor);}

function setExternalPolicy({enabled=read().external.enabled,provider=read().external.provider||'auto',billingMode=read().external.billingMode||'public',taskRouting=read().external.taskRouting||'master_admin_defined',perAI=read().external.perAI||{},usageLimits=read().external.usageLimits||{}},actor='master_admin'){
 assertMaster(actor);
 const allowed=['free','paid','public','auto'];
 if(!allowed.includes(String(billingMode)))throw new Error('invalid_external_billing_mode');
 const current=read();
 return write({...current,external:{...current.external,enabled:Boolean(enabled),provider:String(provider||'auto'),billingMode:String(billingMode),taskRouting:String(taskRouting||'master_admin_defined'),perAI:perAI&&typeof perAI==='object'?perAI:{},usageLimits:{maxRequestsPerDay:Math.max(0,Number(usageLimits?.maxRequestsPerDay??current.external.usageLimits?.maxRequestsPerDay??0)),maxTokensPerRequest:Math.max(1,Math.min(200000,Number(usageLimits?.maxTokensPerRequest??current.external.usageLimits?.maxTokensPerRequest??4096))),maxCostPerDay:Math.max(0,Number(usageLimits?.maxCostPerDay??current.external.usageLimits?.maxCostPerDay??0)),currency:String(usageLimits?.currency||current.external.usageLimits?.currency||'USD').slice(0,8)}}},actor);
}
function status(){return read();}
module.exports={FILE,DEFAULT,read,write,setExternalEnabled,setExternalPolicy,status,assertMaster};
