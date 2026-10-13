'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server,users}=require('../src/server');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,method,path,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let d='';res.on('data',x=>d+=x);res.on('end',()=>resolve({status:res.statusCode,body:d,headers:res.headers}));});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end()})}
async function login(port,tag){let r=await req(port,'POST','/api/auth/register',{username:tag,email:`${tag}@example.com`,password:'Test123!'});assert.equal(r.status,201);let j=JSON.parse(r.body);r=await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:j.demoOtp||'123456'});assert.equal(r.status,200);r=await req(port,'POST','/api/auth/login',{identifier:tag,password:'Test123!'});assert.equal(r.status,200);const cookie=r.headers['set-cookie']?.[0]?.split(';')[0];assert.ok(cookie);const user=JSON.parse(r.body).user;const u=users.get(user.id);for(const k of ['comicCreator','audioCreator','reelCreator'])u.subscriptions[k]=true;return cookie}
async function create(port,cookie,type,workType){const r=await req(port,'POST','/api/content',{type,workType,title:`${type} final studio`,body:`${type} draft`,status:'draft',rightsConfirmed:true,mediaRightsConfirmed:true},cookie);assert.equal(r.status,201);return JSON.parse(r.body).content.id}

test('REF-9.2.57.10 all four studio formats persist, validate and publish through one governed contract',async()=>{
 const s=http.createServer(server);await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;
 try{
  const c=await login(p,'fmtfinal'+Date.now());
  const story=await create(p,c,'story','short-story');
  let r=await req(p,'PATCH',`/api/content/${story}/studio`,{project:{language:'gu',premise:'A governed story',outline:['Hook','Conflict','Resolution'],acts:[{id:'a1',number:1,title:'Act I'}],characters:[{id:'ch1',name:'Asha'}],scenes:[{id:'s1',actId:'a1',title:'Opening',body:'Scene',characterIds:['ch1']}],beats:[{id:'b1',sceneId:'s1',characterId:'ch1',action:'Choice'}],continuity:{canonicalFacts:['Asha chooses'],openThreads:['The consequence']}}},c);assert.equal(r.status,200);
  r=await req(p,'GET',`/api/studio/story/${story}/readiness`,null,c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).readiness.ready,true);
  r=await req(p,'POST',`/api/studio/story/${story}/approve`,{},c);assert.equal(r.status,200);
  r=await req(p,'POST',`/api/studio/publish/${story}`,{status:'published',rightsConfirmed:true,idempotencyKey:'final-story-1'},c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).publication.status,'published');

  const comic=await create(p,c,'comic','webtoon');
  r=await req(p,'PATCH',`/api/content/${comic}/studio`,{project:{pages:[{page:1,panels:[{scene:'Opening',dialogue:'Hello',x:5,y:5,w:45,h:40,speechBubbles:[{text:'Hello',language:'gu',type:'speech',font:'system',indicLigature:true}],layers:[{name:'art',visible:true,locked:false}]}],layers:[{name:'page-bg',visible:true,locked:false}]}],dpi:300,printPreset:'screen'}},c);assert.equal(r.status,200);
  r=await req(p,'POST',`/api/studio/publish/${comic}`,{status:'published',rightsConfirmed:true,mediaRightsConfirmed:true,idempotencyKey:'final-comic-1'},c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).publication.status,'published');

  const audio=await create(p,c,'audio','fm-show');
  r=await req(p,'PATCH',`/api/content/${audio}/studio`,{project:{episodes:[{episode:1,title:'Pilot',tracks:[{startMs:0,endMs:30000,gainDb:-1,pan:0,effects:[]}],segments:[{segment:1,title:'Intro',startMs:0,endMs:5000}]}],sampleRate:'48000',bitDepth:'24',loudnessTarget:-14,truePeak:-1,phonemeLocked:true,smpteTimecode:'00:00:00:00'}},c);assert.equal(r.status,200);
  r=await req(p,'POST',`/api/studio/publish/${audio}`,{status:'published',rightsConfirmed:true,mediaRightsConfirmed:true,idempotencyKey:'final-audio-1'},c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).publication.status,'published');

  const reel=await create(p,c,'reel','two-minute-story');
  r=await req(p,'PATCH',`/api/content/${reel}/studio`,{project:{clips:[{order:1,duration:7,speed:1.25,start:0,keyframes:[{frame:0,easing:'linear'}],captions:[{text:'ગુજરાતી caption',start:0,end:3}]}],fps:60,resolution:'1080x1920',aspectRatio:'9:16',safeZones:true,autoFrame:true,smpteTimecode:'00:00:00:00',timelineSnap:true}},c);assert.equal(r.status,200);
  r=await req(p,'POST',`/api/studio/publish/${reel}`,{status:'published',rightsConfirmed:true,mediaRightsConfirmed:true,idempotencyKey:'final-reel-1'},c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).publication.status,'published');

  for(const [type,id] of [['story',story],['comic',comic],['audio',audio],['reel',reel]]){r=await req(p,'GET',`/api/content/${id}/studio`,null,c);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).studio.project!=null,true,`${type} studio project persisted`)}
 }finally{s.close()}
});

test('REF-9.2.57.10 editor source loads every format studio state and uses native endpoints',()=>{
 const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','public','app.js'),'utf8');
 assert.match(app,/\/api\/content\/.*\/studio/);
 assert.match(app,/renderStudioWorkspace\(c\.type,state\.studioProject\)/);
 assert.match(app,/api\/studio\/publish/);
 assert.match(app,/Comic Studio/);assert.match(app,/FM Studio/);assert.match(app,/Reel Studio/);assert.match(app,/Story Studio/);
});
