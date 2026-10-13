'use strict';
const {setTimeout:delay}=require('node:timers/promises');
async function requestJson({endpoint,apiKey,payload,timeoutMs=8000,idempotencyKey='',retries=2}={}){
 if(!endpoint||!apiKey)throw Object.assign(new Error('provider_not_configured'),{code:'provider_not_configured'});
 let last;
 for(let attempt=0;attempt<=retries;attempt++){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(500,timeoutMs));
  try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`,...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify(payload),signal:controller.signal});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,2000)}};if(r.ok)return {ok:true,status:r.status,data};last=Object.assign(new Error(`provider_http_${r.status}`),{code:`provider_http_${r.status}`,status:r.status,data});if(r.status<500&&r.status!==429)break;}catch(e){last=e.name==='AbortError'?Object.assign(new Error('provider_timeout'),{code:'provider_timeout'}):e;}finally{clearTimeout(timer)}
  if(attempt<retries)await delay(150*(attempt+1));
 }
 throw last||new Error('provider_request_failed');
}
module.exports={requestJson};
