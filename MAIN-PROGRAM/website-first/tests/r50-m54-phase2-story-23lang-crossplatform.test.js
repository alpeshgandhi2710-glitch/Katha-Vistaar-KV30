'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {server}=require('../src/server');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const r=http.request({port,method,path,headers:{'content-type':'application/json',...(cookie?{cookie}: {})}},res=>{let d='';res.on('data',x=>d+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:d}));});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end();});}
function cookieOf(r){return (r.headers['set-cookie']||[])[0]?.split(';')[0]||'';}
async function registerLogin(port){const u='m54x'+Math.random().toString(36).slice(2,12);let r=await req(port,'POST','/api/auth/register',{username:u,email:u+'@example.com',password:'Test123!'});if(r.status!==201) throw new Error('register='+r.status+' '+r.body);const j=JSON.parse(r.body);r=await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});if(r.status!==200) throw new Error('verify='+r.status+' '+r.body);r=await req(port,'POST','/api/auth/login',{identifier:u,password:'Test123!'});if(r.status!==200) throw new Error('login='+r.status+' '+r.body);return cookieOf(r);}

test('M54 Story AI assist executes through governed internal path for all 23 languages',async()=>{
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 try{
  const port=srv.address().port,cookie=await registerLogin(port);
  let r=await req(port,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'M54 23L',summary:'Language runtime test',body:'A short story.',rightsConfirmed:false,mediaRightsConfirmed:false,language:'en'},cookie);
  assert.equal(r.status,201);const cid=JSON.parse(r.body).content.id;
  const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/ai-language-support-v30.json'),'utf8'));
  assert.equal(cfg.languages.length,23);
  for(const language of cfg.languages.map(x=>x.code)){
   r=await req(port,'POST',`/api/studio/story/${cid}/ai-assist`,{task:'story_map',request:'Develop one concise story beat while preserving existing facts.',language},cookie);
   assert.equal(r.status,200,language);const j=JSON.parse(r.body);assert.equal(j.ok,true,language);assert.equal(j.proposal.language,language);assert.equal(j.proposal.externalUsed,false,language);assert.equal(j.proposal.approvalRequired,true,language);
  }
 }finally{srv.close();}
});

test('M54 mobile Story Studio exposes the governed M49-M53 continuation APIs',()=>{
 const p=path.join(__dirname,'../../mobile/lib/story_studio.dart');const s=fs.readFileSync(p,'utf8');
 for(const x of ['translation-drafts','character-matrix','/continuity','/review/finding/','/ai-assist'])assert.match(s,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(s,/saveTranslationDraft/);assert.match(s,/saveCharacterMatrix/);assert.match(s,/saveContinuity/);assert.match(s,/runReviewFindingUpdate/);assert.match(s,/storyAiAssist/);
});
