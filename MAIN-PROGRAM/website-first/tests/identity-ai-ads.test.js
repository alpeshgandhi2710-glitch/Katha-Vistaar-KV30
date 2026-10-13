const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const ads=require(path.join(__dirname,'../../backend/src/services/internal-ads'));
const bus=require(path.join(__dirname,'../../backend/src/services/ai-communication'));
const training=require(path.join(__dirname,'../../backend/src/services/training-ai'));
test('internal ad fallback is available without external ad service',()=>{assert.ok(ads.list().length>=3);assert.equal(ads.preview('kv-app-features',{role:'user'}).allowed,true);});
test('AI communication is allowlist-only',()=>{assert.throws(()=>bus.send('internal_ai','unknown_ai',{}),/ai_communication_not_permitted/);assert.doesNotThrow(()=>bus.send('security_ai','master_admin_ai',{risk:'low'},{scope:'security-review'}));});
test('training AI has bounded curriculum',()=>{const s=training.start('admin','test-user');assert.ok(s.lessons.length>=5);const n=training.next(s.id);assert.equal(n.index,1);});

const http=require('node:http');
const {server}=require('../src/server');
function req2(port,path,method='GET',body=null,headers={}){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const h={'Content-Type':'application/json',...headers};if(data)h['Content-Length']=Buffer.byteLength(data);const x=http.request({port,path,method,headers:h},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,body:s,headers:res.headers}));});x.on('error',reject);if(data)x.write(data);x.end();});}
test('v30.1 AI Management is protected by the admin session and exposes the governed layer registry',async()=>{
  const oldKey=process.env.KV_ADMIN_KEY,oldRole=process.env.KV_ADMIN_ROLE;process.env.KV_ADMIN_KEY='ai-test-key';process.env.KV_ADMIN_ROLE='master_admin';
  const s=http.createServer(server);await new Promise(r=>s.listen(0,r));const port=s.address().port;
  try{
    const denied=await req2(port,'/api/admin/ai-dashboard');assert.equal(denied.status,401);
    const login=await req2(port,'/api/admin/session','POST',{key:'ai-test-key',role:'master_admin'});assert.equal(login.status,200);
    const cookie=login.headers['set-cookie']?.[0]?.split(';')[0]||'';
    const ok=await req2(port,'/api/admin/ai-dashboard','GET',null,{Cookie:cookie});assert.equal(ok.status,200);
    const j=JSON.parse(ok.body);assert.ok(j.layers.includes('help_support_ai'));assert.ok(j.layers.includes('designated_admin_ai'));assert.ok(j.layers.includes('master_admin_ai'));assert.ok(j.policy);assert.ok(j.management.allManaged);
  }finally{await new Promise(r=>s.close(r));if(oldKey===undefined)delete process.env.KV_ADMIN_KEY;else process.env.KV_ADMIN_KEY=oldKey;if(oldRole===undefined)delete process.env.KV_ADMIN_ROLE;else process.env.KV_ADMIN_ROLE=oldRole;}
});
