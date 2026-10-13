'use strict';
const crypto=require('node:crypto');
function makeInternalTransactionalMail({mailOutbox=[],sendInternal,sendExternal,services,persistPath=null,maxOutboxEntries=500}={}){
 const val=v=>String(v??'').trim();
 const queue=[];
 const persist=()=>{if(!persistPath)return;try{const fs=require('node:fs');const path=require('node:path');fs.mkdirSync(path.dirname(persistPath),{recursive:true});const tmp=persistPath+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(mailOutbox.slice(0,maxOutboxEntries),null,2)+'\n','utf8');fs.renameSync(tmp,persistPath);}catch{}};
 const restore=()=>{if(!persistPath)return;try{const fs=require('node:fs');if(fs.existsSync(persistPath)){const rows=JSON.parse(fs.readFileSync(persistPath,'utf8'));if(Array.isArray(rows)){mailOutbox.splice(0,mailOutbox.length,...rows.slice(0,maxOutboxEntries));}}}catch{}};
 restore();
 const nextDelay=(attempt)=>Math.min(30000,250*Math.pow(2,Math.max(0,attempt-1)));
 const enqueue=(input={})=>{const channel=val(input.channel||'email').toLowerCase();if(!['email','sms'].includes(channel))throw new Error('transactional_channel_invalid');const row={id:'MAIL-'+crypto.randomBytes(6).toString('hex').toUpperCase(),channel,to:val(input.to),subject:val(input.subject||'Katha Vistaar'),text:val(input.text),category:val(input.category||'transactional'),attempts:0,status:'queued',createdAt:new Date().toISOString()};if(!row.to)throw new Error('mail_recipient_required');queue.push(row);persist();return row;};
 const deliver=async(row)=>{
   const fallback=async()=>typeof sendInternal==='function'?sendInternal(row):{mode:'internal_queued',delivered:false,queued:true};
   const external=async()=>typeof sendExternal==='function'?sendExternal(row):{mode:'external_not_configured',delivered:false};
   const channel=val(row.channel||'email').toLowerCase();
   const internalResult=await fallback();
   if(internalResult?.delivered)return internalResult;
   if(channel==='sms')return internalResult;
   const enabled=services?.capability?.('email')?.enabled;
   if(!enabled)return internalResult;
   const result=await services.safeCallAsync('email',external,internalResult,{input:JSON.stringify({to:row.to,category:row.category}),idempotencyKey:row.id});
   return result?.value||internalResult;
 };
 const flush=async()=>{const results=[];while(queue.length){const row=queue.shift();row.attempts++;try{const result=await deliver(row);Object.assign(row,result,{status:result?.delivered?'sent':'pending'});}catch(e){row.status='pending';row.error=String(e.message||e).slice(0,160);row.nextAttemptAt=new Date(Date.now()+nextDelay(row.attempts)).toISOString();}mailOutbox.unshift(row);if(mailOutbox.length>maxOutboxEntries)mailOutbox.length=maxOutboxEntries;persist();results.push({...row});}return results;};
 return {enqueue,flush,deliver,pending:()=>queue.map(x=>({...x})),nextDelay,persist};
}
module.exports={makeInternalTransactionalMail};
