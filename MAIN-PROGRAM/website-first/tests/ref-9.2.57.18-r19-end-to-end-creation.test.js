'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server}=require('../src/server.js');
function cookie(r){return r.headers.get('set-cookie')?.split(';')[0]||''}
async function req(p,m,path,body,c=''){return fetch(`http://127.0.0.1:${p}${path}`,{method:m,headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function register(p,n){let r=await req(p,'POST','/api/auth/register',{username:n,email:n+'@example.com',password:'secret1'});assert.equal(r.status,201);const j=await r.json();r=await req(p,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});assert.equal(r.status,200);r=await req(p,'POST','/api/auth/login',{identifier:n,password:'secret1'});assert.equal(r.status,200);return cookie(r)}
test('R19 authenticated creation lifecycle: create -> media -> edit -> snapshot -> copy -> learning -> watermarked export -> progress',async()=>{
 const srv=http.createServer(server).listen(0);const p=srv.address().port;
 try{
  const u=await register(p,'r19e2e'+Date.now());
  let r=await req(p,'POST','/api/content',{type:'story',title:'R19 E2E Story',body:'Rain falls over the village while birds call from the trees.',rightsConfirmed:true,mediaRightsConfirmed:true},u);assert.equal(r.status,201);const c=(await r.json()).content;
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  r=await req(p,'POST','/api/media/assets',{mimeType:'image/png',filename:'rain.png',data:'data:image/png;base64,'+png},u);assert.equal(r.status,201);const asset=(await r.json()).asset;assert.equal(asset.status,'quarantined');
  r=await req(p,'PATCH','/api/content/'+c.id,{body:'Rain falls over the village while birds call from the trees. A child watches the waterfall.',mediaAssetId:asset.id,mediaAssetIds:[asset.id],rightsConfirmed:true,mediaRightsConfirmed:true},u);assert.equal(r.status,200);
  r=await req(p,'POST','/api/content/snapshots',{contentId:c.id,label:'R19 E2E checkpoint'},u);assert.equal(r.status,201);
  r=await req(p,'POST','/api/content/'+c.id+'/duplicate',{},u);assert.equal(r.status,201);const copy=(await r.json()).content;assert.equal(copy.derivedFrom.mode,'creator_copy');
  r=await req(p,'GET','/api/studio/natural-sounds/external?q=rain&language=en&billingMode=free',undefined,u);assert.equal(r.status,200);const ns=await r.json();assert.equal(ns.internalFallback,true);assert.equal(ns.billingMode,'free');
  r=await req(p,'POST','/api/ai/learning/observe',{aiId:'story_ai',language:'en',projectId:c.id,input:'Creator corrected the rain scene for natural phrasing.',output:'Approved natural-language phrasing for the rain scene.',format:'story',kind:'creator_correction',consent:true,rightsConfirmed:true,evaluationPassed:true,license:'creator-confirmed'},u);if(r.status!==201) throw new Error('learning_response='+await r.text());const learn=await r.json();assert.equal(learn.storedInMemory,true);assert.equal(learn.productionModelChanged,false);
  r=await req(p,'GET','/api/content/'+c.id+'/export',undefined,u);assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/application\/zip/);assert.match(r.headers.get('content-disposition')||'',/KV-WATERMARK/);const zip=await r.arrayBuffer();assert.ok(zip.byteLength>100);
  r=await req(p,'GET','/api/profile/progress-report',undefined,u);assert.equal(r.status,200);const pr=await r.json();assert.equal(pr.report.privacy,'user_scoped');assert.ok(pr.report.author.works>=2);assert.ok(pr.report.creator.mediaAssets>=1);
  console.log('PASS REF-9.2.57.18-R19: authenticated creation lifecycle create→media→edit→snapshot→copy→learning→KV-watermarked export→profile progress');
 } finally {srv.close();}
});
