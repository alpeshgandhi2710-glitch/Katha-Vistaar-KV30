const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createServiceManager}=require('../services/service-manager');
const ROOT=path.resolve(__dirname,'..');
test('external services are safe fallbacks when not configured',()=>{
  const sm=createServiceManager(ROOT,{});
  const p=sm.capability('payments');
  assert.equal(p.enabled,false); assert.equal(p.mode,'fallback'); assert.equal(p.fallback,'feature_unavailable');
  const r=sm.safeCall('email',()=>{throw new Error('should not call')},'in_app');
  assert.equal(r.ok,false); assert.equal(r.value,'in_app');
});
test('master admin can enable only a ready service and disable it without crashing',()=>{
  const env={KV_EMAIL_PROVIDER:'test',KV_EMAIL_API_KEY:'secret',KV_EMAIL_HEALTH_OK:'true'};
  const sm=createServiceManager(ROOT,env);
  assert.equal(sm.get('email').available,true);
  assert.throws(()=>sm.toggle('email',true,'admin'),/master_admin_required/);
  assert.equal(sm.toggle('email',true,'master_admin').enabled,true);
  assert.equal(sm.toggle('email',false,'master_admin').enabled,false);
});
test('payment cannot be enabled before licence gate',()=>{
  const env={KV_PAYMENT_PROVIDER:'test',KV_PAYMENT_KEY_ID:'id',KV_PAYMENT_SECRET:'secret'};
  const sm=createServiceManager(ROOT,env);
  assert.equal(sm.get('payments').available,false);
  assert.throws(()=>sm.toggle('payments',true,'master_admin'),/service_prerequisites_not_ready/);
});

test('external layer stays off until provider health is ready, while internal fallback stays available',()=>{
  const sm=createServiceManager(ROOT,{KV_EMAIL_PROVIDER:'test',KV_EMAIL_API_KEY:'secret',KV_EMAIL_HEALTH_OK:'true'});
  assert.equal(sm.get('email').available,true);
  assert.equal(sm.get('email').enabled,false);
  assert.equal(sm.toggle('email',true,'master_admin').enabled,true);
  assert.equal(sm.capability('email').layer,'external');
  sm.toggle('email',false,'master_admin');
  assert.equal(sm.capability('email').layer,'internal');
});

test('master admin enable performs a real provider health check before switching to external layer',async()=>{
  const http=require('node:http');
  const server=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');return}res.writeHead(404);res.end();});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const sm=createServiceManager(ROOT,{KV_EMAIL_PROVIDER:'test',KV_EMAIL_API_KEY:'secret',KV_EMAIL_ENDPOINT:`http://127.0.0.1:${port}`});
  assert.equal(sm.get('email').enabled,false);
  const ready=await sm.healthCheck('email');assert.equal(ready.available,true);assert.equal(ready.health.passed,true);
  const on=await sm.toggleAsync('email',true,'master_admin');assert.equal(on.enabled,true);assert.equal(on.mode,'on');
  sm.toggle('email',false,'master_admin');server.close();
});
