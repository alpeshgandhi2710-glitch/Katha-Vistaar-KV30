'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
process.env.ALLOW_LOCAL_DEMO='true';
const {server}=require('../src/server');
const LANG=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
function start(){return new Promise(r=>{const s=http.createServer(server);s.listen(0,'127.0.0.1',()=>r(s));})}
function req(port,method,path,body=null,cookie=''){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const headers={'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{})};const x=http.request({host:'127.0.0.1',port,method,path,headers},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,body:s,headers:res.headers}))});x.on('error',reject);if(data)x.write(data);x.end()})}
const cookie=r=>(r.headers['set-cookie']||[])[0]?.split(';')[0]||'';
async function register(port,name){const r=await req(port,'POST','/api/auth/register',{username:name,email:`${name}@example.com`,password:'secret1'});assert.equal(r.status,201);const j=JSON.parse(r.body);const v=await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});assert.equal(v.status,200);const l=await req(port,'POST','/api/auth/login',{identifier:name,password:'secret1'});assert.equal(l.status,200);return cookie(l)}

test('R50-M47 Story creation/edit/read propagates every governed 23-language content language',async()=>{
 const s=await start();try{
  const p=s.address().port,cookie=await register(p,'storylang47');
  const langApi=await req(p,'GET','/api/ai/languages');assert.equal(langApi.status,200);
  const contract=JSON.parse(langApi.body).contract;assert.equal(contract.requiredLanguageCount,23);
  assert.deepEqual(contract.languages.map(x=>x.code),LANG);
  let count=0;
  for(const language of LANG){
   const c=await req(p,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:`Story ${language}`,body:'A governed multilingual story.',language,rightsConfirmed:true,mediaRightsConfirmed:true});
   // The endpoint requires authentication; retry with the authenticated cookie explicitly.
   const cr=c.status===401?await req(p,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:`Story ${language}`,body:'A governed multilingual story.',language,rightsConfirmed:true,mediaRightsConfirmed:true},cookie):c;
   assert.equal(cr.status,201,language);
   const cid=JSON.parse(cr.body).content.id;const created=JSON.parse(cr.body).content;
   assert.equal(created.language,language,language);
   assert.equal(created.sourceLanguage,language,language);
   assert.equal(created.studioProject.language,language,language);
   const save=await req(p,'PUT',`/api/studio/story/${cid}`,{language,project:{language,title:`Story ${language}`,premise:`Premise ${language}`}},cookie);
   assert.equal(save.status,200,language);
   const saved=JSON.parse(save.body).story;
   assert.equal(saved.language,language,language);assert.equal(saved.studioProject.language,language,language);
   const read=await req(p,'GET',`/api/studio/story/${cid}`,null,cookie);assert.equal(read.status,200,language);
   const out=JSON.parse(read.body);assert.equal(out.story.language,language,language);assert.equal(out.story.studioProject.language,language,language);
   count++;
  }
  assert.equal(count,23);
 }finally{s.close()}
});

test('R50-M47 Story language contract rejects non-canonical content language and preserves publish gate',async()=>{
 const s=await start();try{
  const p=s.address().port,cookie=await register(p,'storylang47b');
  const bad=await req(p,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'Bad language',body:'Draft',language:'xx',rightsConfirmed:true,mediaRightsConfirmed:true},cookie);
  assert.equal(bad.status,422);assert.equal(JSON.parse(bad.body).error,'unsupported_story_language');
  const c=await req(p,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'Publish language',body:'Draft',language:'gu',rightsConfirmed:true,mediaRightsConfirmed:true},cookie);
  assert.equal(c.status,201);const cid=JSON.parse(c.body).content.id;
  const pub=await req(p,'POST',`/api/studio/publish/${cid}`,{status:'published',rightsConfirmed:true,mediaRightsConfirmed:true,idempotencyKey:'m47-lang-gate'},cookie);
  assert.equal(pub.status,422);const j=JSON.parse(pub.body);assert.equal(j.error,'studio_publish_contract_failed');assert.equal(j.contract.checks.storyLanguage,true);
 }finally{s.close()}
});

console.log('PASS R50-M47: Story content language contract covers exact 23-language runtime propagation.');
