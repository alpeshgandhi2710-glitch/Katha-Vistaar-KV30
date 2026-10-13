'use strict';
const fs=require('node:fs');
const path=require('node:path');
function createPaymentRoutingManager(root,{statePath,readUser,writeUser,actorCheck}={}){
 const testMode=process.argv.some(x=>String(x).includes('/tests/'))||process.argv.includes('--test')||String(process.env.NODE_ENV||'').toLowerCase()==='test';
 const file=statePath||(testMode?path.join(require('node:os').tmpdir(),'katha-vistaar-tests',`payment-routing-state-${process.pid}.json`):path.join(root,'data','payment-routing-state-v30.json'));
 let state={version:'30.0.0',destinations:{}};
 try{const x=JSON.parse(fs.readFileSync(file,'utf8'));if(x&&typeof x==='object')state={...state,...x,destinations:{...(x.destinations||{})}}}catch{}
 const save=()=>{fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2)+'\n');fs.renameSync(tmp,file)};
 const mask=v=>{const s=String(v||'');return s.length<=4?'••••':`${'•'.repeat(Math.max(0,s.length-4))}${s.slice(-4)}`};
 const normalized=u=>u?{userId:u.id,accountHolder:String(u.accountHolder||u.name||u.profileName||u.username||''),bankAccountNumber:u.bankAccountNumber||null,bankName:u.bankName||null,ifsc:u.ifsc||null,bankBranch:u.bankBranch||null,bankAddress:u.bankAddress||null,pan:u.pan||null,verified:!!u.royaltyDetailsVerified}:null;
 const configured=u=>{
   if(u===undefined||u===null){return Object.values(state.destinations||{}).some(r=>!!(r&&r.bankAccountNumber&&r.bankName&&r.ifsc&&r.pan));}
   const r=normalized(u);return !!(r&&r.bankAccountNumber&&r.bankName&&r.ifsc&&r.pan);
 };
 const publicStatus=u=>{const r=normalized(u);if(!r)return {configured:false,verified:false};return {userId:r.userId,accountHolder:r.accountHolder,bankAccountNumber:mask(r.bankAccountNumber),bankName:r.bankName,ifsc:r.ifsc,bankBranch:r.bankBranch,pan:r.pan?mask(r.pan):null,configured:configured(u),verified:r.verified,locked:r.verified}};
 function status(u){return {configured:configured(u),verified:!!u?.royaltyDetailsVerified,locked:!!u?.royaltyDetailsVerified,destination:publicStatus(u)}}
 function updateDestination(userId,patch={},actor='system'){
   if(typeof actorCheck==='function'&&!actorCheck(actor))throw Object.assign(new Error('payment_routing_authorization_required'),{code:'payment_routing_authorization_required'});
   const u=typeof readUser==='function'?readUser(userId):null;if(!u)throw Object.assign(new Error('user_not_found'),{code:'user_not_found'});
   if(u.royaltyDetailsVerified&&String(actor)!=='internal_system')throw Object.assign(new Error('verified_destination_locked'),{code:'verified_destination_locked'});
   for(const k of ['bankAccountNumber','bankName','ifsc','bankBranch','bankAddress','pan','accountHolder'])if(patch[k]!==undefined)u[k]=String(patch[k]).trim();
   state.destinations[String(userId)]={...normalized(u),updatedAt:new Date().toISOString(),updatedBy:String(actor)};save();if(typeof writeUser==='function')writeUser(u);return status(u);
 }
 function getState(){return JSON.parse(JSON.stringify(state));}
 return {configured,publicStatus,status,updateDestination,getState,file};
}
module.exports={createPaymentRoutingManager};
