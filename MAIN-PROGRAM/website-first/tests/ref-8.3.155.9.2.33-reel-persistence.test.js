const test=require('node:test');const assert=require('assert');
require('./helpers/test-approved-monetization-fixture');
const http=require('http');const {server}=require('../src/server');
function req(port,method,path,data,cookie){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,method,path,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>resolve({status:res.statusCode,body:b,headers:res.headers}));});r.on('error',reject);if(data)r.write(JSON.stringify(data));r.end()})}

async function internalSub(port,cookie){const cat=JSON.parse((await req(port,'GET','/api/monetization/catalog',null,cookie)).body).policy;const plan=cat.subscriptions.find(x=>x.id==='reel_creator');if(!plan)return null;let paymentToken=null;if(Number(plan.price||0)>0){const st=await req(port,'POST','/api/payments/internal-otp/start',{action:'subscription',reference:plan.id,amount:Number(plan.price||0)},cookie);const sj=JSON.parse(st.body);await req(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},cookie);paymentToken=sj.paymentToken;}return req(port,'POST','/api/subscriptions/purchase',{type:'reelCreator',planId:plan.id,mode:'test',method:'internal_test',paymentToken,idempotencyKey:`reel-persist-${Date.now()}`},cookie)}
async function login(port,tag){let r=await req(port,'POST','/api/auth/register',{username:tag,email:`${tag}@example.com`,password:'Test123!'});const j=JSON.parse(r.body);await req(port,'POST','/api/auth/verify-otp',{target:j.target,purpose:j.purpose,otp:j.demoOtp||'123456'});r=await req(port,'POST','/api/auth/login',{identifier:tag,password:'Test123!'});return (r.headers['set-cookie']||[])[0]?.split(';')[0]}

test('Reel Studio persists UI-shaped safe-zone state and rich clip revision data',async()=>{
 const s=http.createServer(server);await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;
 try{
  const c=await login(port,'reelpersist'); const sub=await internalSub(port,c); assert.equal(sub.status,200);
  const created=await req(port,'POST','/api/content',{type:'reel',workType:'two-minute-story',category:'drama',title:'Reel persistence',body:'draft',status:'draft',rightsConfirmed:true,mediaRightsConfirmed:true},c);
  assert.equal(created.status,201); const id=JSON.parse(created.body).content.id;
  const p1={clips:[{order:1,duration:7,speed:1.25,start:0,keyframes:[{frame:0,easing:'linear'},{frame:30,easing:'ease-in-out'}],captions:[{text:'ગુજરાતી caption',start:0,end:3}]}],fps:60,resolution:'1080x1920',aspectRatio:'9:16',safeZones:true,autoFrame:true,smpteTimecode:'00:00:00:00',timelineSnap:true};
  const a=await req(port,'PATCH',`/api/content/${id}/studio`,{project:p1},c); assert.equal(a.status,200);
  const g=await req(port,'GET',`/api/content/${id}/studio`,null,c); assert.equal(g.status,200);
  const saved=JSON.parse(g.body).studio.project; assert.equal(saved.safeZones,true); assert.equal(saved.clips[0].captions[0].text,'ગુજરાતી caption');
  const p2={...p1,clips:[...p1.clips,{order:2,duration:4,speed:1,keyframes:[{frame:0,easing:'linear'}],captions:[]}]};
  const b=await req(port,'PATCH',`/api/content/${id}/studio`,{project:p2},c); assert.equal(b.status,200); assert.equal(JSON.parse(b.body).revisionCreated,true);
  const vh=await req(port,'GET',`/api/creator/version-history?contentId=${encodeURIComponent(id)}`,null,c); assert.equal(vh.status,200); assert.ok(JSON.parse(vh.body).revisions.length>=2);
 }finally{s.close();}
});
