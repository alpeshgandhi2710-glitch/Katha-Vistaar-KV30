'use strict';
const crypto=require('node:crypto');
function sanitizeItem(x){if(!x||typeof x!=='object')return null;const id=String(x.id||x.assetId||'').slice(0,160);const title=String(x.title||x.name||'').slice(0,240);const url=String(x.url||x.previewUrl||'').trim();if(!id||!url||!/^https?:\/\//i.test(url))return null;return {id,title,url,previewUrl:String(x.previewUrl||url).slice(0,2000),durationSeconds:Number.isFinite(Number(x.durationSeconds))?Math.max(0,Number(x.durationSeconds)):null,licence:String(x.licence||x.license||'').slice(0,1000)};}
async function search({endpoint,apiKey,query,language='en',billingMode='public'}={}){
 const url=String(endpoint||'').trim();if(!url||!apiKey)return {ok:false,reason:'provider_not_configured'};
 const controller=new AbortController();const t=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`,'X-KV30-Billing-Mode':String(billingMode)},body:JSON.stringify({query:String(query||'').slice(0,300),language:String(language),billingMode:String(billingMode),requestId:crypto.randomUUID()}),signal:controller.signal});
  const data=await r.json().catch(()=>({}));if(!r.ok)return {ok:false,reason:`provider_http_${r.status}`};
  const items=Array.isArray(data.items)?data.items.map(sanitizeItem).filter(Boolean).slice(0,40):[];
  return {ok:true,provider:String(data.provider||'external_natural_sound_provider').slice(0,120),items,licence:String(data.licence||data.license||'').slice(0,1000),billingMode:String(billingMode),responseFirewall:'schema_sanitized'};
 }catch(e){return {ok:false,reason:e.name==='AbortError'?'provider_timeout':'provider_request_failed'};}
 finally{clearTimeout(t)}
}
module.exports={search};
