'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server}=require('../src/server.js');
function cookie(r){return r.headers.get('set-cookie')?.split(';')[0]||''}
async function req(p,m,path,body,c=''){return fetch(`http://127.0.0.1:${p}${path}`,{method:m,headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function register(p,n){let r=await req(p,'POST','/api/auth/register',{username:n,email:n+'@example.com',password:'secret1'});assert.equal(r.status,201);let j=await r.json();r=await req(p,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});assert.equal(r.status,200);r=await req(p,'POST','/api/auth/login',{identifier:n,password:'secret1'});assert.equal(r.status,200);return cookie(r)}
test('R19 publish-right enforcement survives every creator publish path',async()=>{
 const srv=http.createServer(server).listen(0);const p=srv.address().port;
 try{
  const u=await register(p,'r19user'+Date.now());
  let r=await req(p,'POST','/api/content',{type:'story',title:'R19 Rights E2E',body:'Rights test body',rightsConfirmed:true,mediaRightsConfirmed:true},u);assert.equal(r.status,201);const c=(await r.json()).content;
  r=await req(p,'POST','/api/master-admin/login',{masterKey:'katha-vistaar-local-master',productKey:'katha-vistaar-local-product'});assert.equal(r.status,200);const a=cookie(r);
  r=await req(p,'PATCH','/api/admin/content-rights',{workId:c.id,publish:false,unpublish:false,download:false,duplicate:false,contractId:'R19-CONTRACT'},a);assert.equal(r.status,200);
  r=await req(p,'PATCH','/api/content/'+c.id,{status:'published'},u);assert.equal(r.status,403);assert.equal((await r.json()).error,'creator_publish_right_revoked');
  r=await req(p,'POST','/api/studio/publish/'+c.id,{status:'published',rightsConfirmed:true,mediaRightsConfirmed:true},u);assert.equal(r.status,403);assert.equal((await r.json()).error,'creator_publish_right_revoked');
  console.log('PASS REF-9.2.57.18-R19: Master Admin publish-right revocation enforced across standard PATCH and Studio publish paths');
 } finally {srv.close();}
});
