'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const studio=require('../../backend/src/services/story-studio');

test('M52 Story review findings persist status and remain advisory-only',()=>{
  const content={id:'STORY-M52',ownerId:'U1',type:'story',title:'Review Story',rightsConfirmed:true,studioProject:studio.normalizeProject({language:'en',outline:[{title:'Hook'}],acts:[{number:1,title:'Act'}],scenes:[{id:'S1',actId:'',title:'Scene',body:''}],characters:[{id:'C1',name:'Asha'}],beats:[{id:'B1',sceneId:'',action:'Turn'}],characterMatrix:[],continuity:{facts:[],threads:[]},media:[],cover:null})};
  const storyReviews=new Map();const collaborators=new Map();const persistence=()=>{};const audit=()=>{};
  const first=studio.review(content);storyReviews.set(content.id,first);
  assert.ok(first.findings.length>=2);
  const finding=first.findings[0];
  const updated=studio.updateReviewFinding({content,user:{id:'U1'},maps:{storyReviews,collaborators,persistence},findingId:finding.id,status:'acknowledged',audit});
  assert.equal(updated.finding.status,'acknowledged');
  const second=studio.review(content,storyReviews.get(content.id));
  const carried=second.findings.find(f=>f.id===finding.id);assert.equal(carried.status,'acknowledged');
  storyReviews.set(content.id,second);
  const resolved=studio.updateReviewFinding({content,user:{id:'U1'},maps:{storyReviews,collaborators,persistence},findingId:finding.id,status:'resolved',audit});
  assert.equal(resolved.finding.status,'resolved');
  assert.throws(()=>studio.updateReviewFinding({content,user:{id:'U1'},maps:{storyReviews,collaborators,persistence},findingId:finding.id,status:'invalid',audit}),/story_review_status_invalid/);
  assert.equal(content.storyPublicationApproval,undefined);
});

test('M52 Story reviewer can resolve advisory finding but cannot mutate Story project',()=>{
  const content={id:'STORY-M52-R',ownerId:'OWNER',type:'story',title:'Review',studioProject:studio.normalizeProject({language:'en',outline:['x'],scenes:[{id:'S1',title:'S',body:''}],characters:[{id:'C1',name:'A'}],beats:[],characterMatrix:[],continuity:{facts:[],threads:[]},media:[],cover:null})};
  const collaborators=new Map([[content.id,[{id:'COL1',userId:'REV',role:'reviewer',active:true}]]]);const storyReviews=new Map([[content.id,studio.review(content)]]);
  const f=storyReviews.get(content.id).findings[0];
  const r=studio.updateReviewFinding({content,user:{id:'REV'},maps:{storyReviews,collaborators,persistence:()=>{}},findingId:f.id,status:'resolved',audit:()=>{}});
  assert.equal(r.finding.status,'resolved');
  assert.throws(()=>studio.saveStory({content,project:content.studioProject,user:{id:'REV'},maps:{collaborators,revisions:new Map(),contentAutosaves:new Map()},audit:()=>{}}),/story_collaboration_role_forbidden/);
});

test('M52 Story Studio uses visual Matrix controls and governed review status actions',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
  assert.match(app,/id="storyCharacterMatrixRows"/);assert.match(app,/data-matrix-from/);assert.match(app,/data-matrix-type/);assert.match(app,/id="storyAddCharacterMatrix"/);
  assert.ok(app.includes("'/api/studio/story/'+encodeURIComponent(cid)+'/review/finding/'"));
  assert.match(app,/data-review-status="acknowledged"/);assert.match(app,/data-review-status="resolved"/);
});


test('M52 Story review finding PATCH route is authorization-gated and persists the advisory state',async()=>{
  process.env.ALLOW_LOCAL_DEMO='true';
  const http=require('node:http');
  const {server}=require('../src/server');
  const start=()=>new Promise(resolve=>{const s=http.createServer(server);s.listen(0,'127.0.0.1',()=>resolve(s));});
  const req=(port,method,path,body=null,cookie='')=>new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const headers={'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{})};const x=http.request({host:'127.0.0.1',port,method,path,headers},res=>{let out='';res.on('data',c=>out+=c);res.on('end',()=>resolve({status:res.statusCode,body:out,headers:res.headers}));});x.on('error',reject);if(data)x.write(data);x.end();});
  const cookieOf=r=>(r.headers['set-cookie']||[])[0]?.split(';')[0]||'';
  const s=await start();
  try{
    const port=s.address().port;
    const reg=await req(port,'POST','/api/auth/register',{username:'m52reviewroute',email:'m52reviewroute@example.com',password:'secret1'});assert.equal(reg.status,201);
    const j=JSON.parse(reg.body);const otp=await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:'123456'});assert.equal(otp.status,200);
    const login=await req(port,'POST','/api/auth/login',{identifier:'m52reviewroute',password:'secret1'});assert.equal(login.status,200);const cookie=cookieOf(login);
    const project={language:'en',outline:[{title:'Hook'}],acts:[{number:1,title:'Act'}],scenes:[{id:'S1',actId:'',title:'Scene',body:''}],characters:[{id:'C1',name:'Asha'}],beats:[{id:'B1',sceneId:'',action:'Turn'}],characterMatrix:[],continuity:{facts:[],threads:[]},media:[],cover:null};
    const c=await req(port,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'M52 Review Route',body:'Draft',status:'draft',rightsConfirmed:true,mediaRightsConfirmed:true,studioProject:project},cookie);assert.equal(c.status,201);const cid=JSON.parse(c.body).content.id;
    const review=await req(port,'POST',`/api/studio/story/${cid}/review`,{},cookie);assert.equal(review.status,200);const finding=JSON.parse(review.body).review.findings[0];
    const patch=await req(port,'PATCH',`/api/studio/story/${cid}/review/finding/${finding.id}`,{status:'resolved'},cookie);assert.equal(patch.status,200);assert.equal(JSON.parse(patch.body).finding.status,'resolved');
  } finally {s.close();}
});
