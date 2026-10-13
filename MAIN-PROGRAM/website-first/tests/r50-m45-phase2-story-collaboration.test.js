'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');
process.env.ALLOW_LOCAL_DEMO='true';
const {server}=require('../src/server');
function start(){return new Promise(r=>{const s=http.createServer(server);s.listen(0,'127.0.0.1',()=>r(s));})}
function req(port,method,path,body=null,cookie=''){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const headers={'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{})};const x=http.request({host:'127.0.0.1',port,method,path,headers},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,body:s,headers:res.headers}))});x.on('error',reject);if(data)x.write(data);x.end()})}
const cookie=r=>(r.headers['set-cookie']||[])[0]?.split(';')[0]||'';
async function register(port,name){const r=await req(port,'POST','/api/auth/register',{username:name,email:`${name}@example.com`,password:'secret1'});assert.equal(r.status,201);const j=JSON.parse(r.body);const v=await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});assert.equal(v.status,200);const l=await req(port,'POST','/api/auth/login',{identifier:name,password:'secret1'});assert.equal(l.status,200);return {cookie:cookie(l),user:j.user||null}}

test('R50-M45 Story collaboration role lifecycle is enforced end-to-end',async()=>{const s=await start();try{const p=s.address().port;const owner=await register(p,'storyowner45');const editor=await register(p,'storyeditor45');const reviewer=await register(p,'storyreviewer45');const viewer=await register(p,'storyviewer45');
const c=await req(p,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'Collaborative Story',body:'Initial draft',status:'draft',rightsConfirmed:true,mediaRightsConfirmed:true},owner.cookie);assert.equal(c.status,201);const cid=JSON.parse(c.body).content.id;
for(const [u,role] of [[editor,'editor'],[reviewer,'reviewer'],[viewer,'viewer']]){const g=await req(p,'POST','/api/studio/story/collaborators',{contentId:cid,userId:u.user.id,role},owner.cookie);assert.equal(g.status,201);}
const list=await req(p,'GET',`/api/studio/story/collaborators?contentId=${encodeURIComponent(cid)}`,null,owner.cookie);assert.equal(list.status,200);assert.equal(JSON.parse(list.body).collaborators.length,3);
const er=await req(p,'GET',`/api/studio/story/${cid}`,null,editor.cookie);assert.equal(er.status,200);assert.equal(JSON.parse(er.body).role,'editor');
const edit=await req(p,'PUT',`/api/studio/story/${cid}`,{project:{language:'en',outline:[{title:'Hook'}],acts:[{number:1,title:'Act I'}],scenes:[{actId:'',number:1,title:'Opening',body:'Editor revision'}],characters:[],beats:[],continuity:{canonicalFacts:['Editor revision'],openThreads:[]}},body:'Editor body'},editor.cookie);assert.equal(edit.status,200);
const vr=await req(p,'GET',`/api/studio/story/${cid}`,null,viewer.cookie);assert.equal(vr.status,200);assert.equal(JSON.parse(vr.body).role,'viewer');
const viewerEdit=await req(p,'PUT',`/api/studio/story/${cid}`,{project:{language:'en',outline:[{title:'Forbidden'}]}},viewer.cookie);assert.equal(viewerEdit.status,422);assert.equal(JSON.parse(viewerEdit.body).error,'story_collaboration_role_forbidden');
const review=await req(p,'POST',`/api/studio/story/${cid}/review`,{},reviewer.cookie);assert.equal(review.status,200);assert.equal(JSON.parse(review.body).role,'reviewer');
const viewerReview=await req(p,'POST',`/api/studio/story/${cid}/review`,{},viewer.cookie);assert.equal(viewerReview.status,403);assert.equal(JSON.parse(viewerReview.body).error,'story_collaboration_role_forbidden');
const row=JSON.parse(list.body).collaborators.find(x=>x.userId===editor.user.id);assert.ok(row);
const role=await req(p,'PATCH',`/api/studio/story/collaborators/${row.id}`,{role:'writer'},owner.cookie);assert.equal(role.status,200);assert.equal(JSON.parse(role.body).collaborator.role,'writer');
const revoke=await req(p,'DELETE',`/api/studio/story/collaborators/${row.id}`,null,owner.cookie);assert.equal(revoke.status,200);assert.equal(JSON.parse(revoke.body).collaborator.active,false);
assert.equal((await req(p,'GET',`/api/studio/story/${cid}`,null,editor.cookie)).status,404);
}finally{s.close()}});
