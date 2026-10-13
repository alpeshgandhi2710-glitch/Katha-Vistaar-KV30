const assert=require('node:assert/strict');const http=require('node:http');const {test}=require('node:test');const {server,VERSION}=require('../src/server');
const req=(p,m,path,b,c)=>fetch(`http://127.0.0.1:${p}${path}`,{method:m,headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:b?JSON.stringify(b):undefined}).then(async r=>({status:r.status,json:await r.json().catch(()=>({})),headers:r.headers}));
async function login(p){const r=await req(p,'POST','/api/auth/login',{identifier:'kv-demo',password:'Demo123!'});assert.equal(r.status,200);return r.headers.get('set-cookie')?.split(';')[0]||'';}
test('P2-30F useful Stitch adaptations are real authenticated APIs',async()=>{assert.equal(VERSION,'KV30-P2-30W');const s=http.createServer(server).listen(0);try{const p=s.address().port,c=await login(p);
 for(const [path,body,checks] of [
  ['/api/ai/social-assistant',{topic:'New story',platform:'generic'},j=>[j.approvalRequired===true,j.canPublish===false,j.proposal?.caption]],
  ['/api/ai/story-mapper',{premise:'A traveller finds a hidden city',branches:3},j=>[j.approvalRequired===true,j.canApply===false,j.nodes?.length===3]],
 ]){const r=await req(p,'POST',path,body,c);assert.equal(r.status,200,path);assert.ok(checks(r.json).every(Boolean),path)}
 const regional=await req(p,'GET','/api/analytics/regional',null,c);assert.equal(regional.status,200);assert.equal(regional.json.privacy.inference,'disabled');
 const events=await req(p,'GET','/api/events/calendar',null,c);assert.equal(events.status,200);assert.ok(events.json.events.length>=1);
 const tiers=await req(p,'GET','/api/creator/tiers',null,c);assert.equal(tiers.status,200);assert.equal(tiers.json.configurable,true);
 }finally{s.close()}});
test('P2-30F promoted Stitch features are wired into UI routes and guarded AI workbench',()=>{const fs=require('node:fs');const path=require('node:path');const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');assert.match(app,/regional-analytics/);assert.match(app,/eventsPage/);assert.match(app,/creatorTiersPage/);assert.match(app,/api\/ai\/social-assistant/);assert.match(app,/api\/ai\/story-mapper/);assert.match(app,/Human approval required/);});
