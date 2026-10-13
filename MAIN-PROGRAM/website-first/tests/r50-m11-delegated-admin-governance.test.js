const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server}=require('../src/server');
const {users}=require('../src/server');
async function req(p,method,path,body,headers={}){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const r=http.request({host:'127.0.0.1',port:p,path,method,headers:{'content-type':'application/json',...(data?{'content-length':Buffer.byteLength(data)}:{}),...headers}},res=>{let d='';res.on('data',x=>d+=x);res.on('end',()=>resolve({status:res.statusCode,json:()=>JSON.parse(d),headers:res.headers}))});r.on('error',reject);if(data)r.write(data);r.end()})}
function cookie(r){return (r.headers['set-cookie']||[])[0]?.split(';')[0]||''}

test('R50-M11 delegated Admin must begin as normal user, Master grants/revokes, same login remains user login',async()=>{
 process.env.KV_ENV='development';process.env.ALLOW_LOCAL_DEMO='true';process.env.KV_ADMIN_KEY='r50-m11-governance';process.env.KV_PRODUCT_KEY='katha-vistaar-local-product';process.env.KV_ADMIN_ROLE='master_admin';
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const p=srv.address().port;
 try{
  let r=await req(p,'POST','/api/auth/register',{username:'delegatedcandidate',email:'delegatedcandidate@example.test',password:'secret1'});assert.equal(r.status,201);
  r=await req(p,'POST','/api/auth/verify-otp',{target:'delegatedcandidate@example.test',purpose:'register-email',otp:'123456'});assert.equal(r.status,200);
  r=await req(p,'POST','/api/auth/login',{identifier:'delegatedcandidate',password:'secret1'});assert.equal(r.status,200);const uc=cookie(r);const uid=r.json().user.id;assert.equal(r.json().user.role,'user');
  r=await req(p,'POST','/api/admin/session',{role:'master_admin',masterKey:'r50-m11-governance',productKey:'katha-vistaar-local-product'});assert.equal(r.status,200);const mc=cookie(r);
  r=await req(p,'POST','/api/admin/identity',{label:'should-not-create-admin',role:'admin',username:'notallowed'} ,{Cookie:mc});assert.equal(r.status,403);assert.equal(r.json().error,'delegated_admin_must_start_as_normal_user');
  r=await req(p,'POST','/api/admin/identity/rights',{userId:uid,grant:true},{Cookie:mc});assert.equal(r.status,200);assert.equal(r.json().role,'admin');assert.equal(users.get(uid).role,'admin');
  r=await req(p,'GET','/api/admin/dashboard',null,{Cookie:uc});assert.equal(r.status,200);
  r=await req(p,'GET','/api/admin/profile',null,{Cookie:uc});assert.equal(r.status,200);assert.equal(r.json().profile.id,uid);assert.equal(r.json().profile.role,'admin');
  r=await req(p,'GET','/api/profile',null,{Cookie:uc});assert.equal(r.status,200);assert.equal(r.json().profile.role,'admin');
  r=await req(p,'POST','/api/admin/identity/rights',{userId:uid,grant:false},{Cookie:mc});assert.equal(r.status,200);assert.equal(r.json().role,'user');assert.equal(users.get(uid).role,'user');
  r=await req(p,'GET','/api/admin/dashboard',null,{Cookie:uc});assert.equal(r.status,401);
  r=await req(p,'GET','/api/profile',null,{Cookie:uc});assert.equal(r.status,200);assert.equal(r.json().profile.role,'user');
 }finally{srv.close();for(const k of ['KV_ENV','ALLOW_LOCAL_DEMO','KV_ADMIN_KEY','KV_PRODUCT_KEY','KV_ADMIN_ROLE'])delete process.env[k];}
});

test('Master Admin profile is available through its governed admin session',async()=>{
 process.env.KV_ENV='development';process.env.ALLOW_LOCAL_DEMO='true';process.env.KV_ADMIN_KEY='r50-m11-master';process.env.KV_PRODUCT_KEY='katha-vistaar-local-product';process.env.KV_ADMIN_ROLE='master_admin';
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const p=srv.address().port;
 try{let r=await req(p,'POST','/api/master-admin/login',{masterKey:'r50-m11-master',productKey:'katha-vistaar-local-product'});assert.equal(r.status,200);const sid=r.json().sessionId;r=await req(p,'GET','/api/admin/profile',null,{'x-kv-admin-session':sid});assert.equal(r.status,200);assert.equal(r.json().profile.role,'master_admin');assert.deepEqual(r.json().rights,['*']);r=await req(p,'GET','/api/profile',null,{'x-kv-admin-session':sid});assert.equal(r.status,200);assert.equal(r.json().profile.role,'master_admin');}finally{srv.close();for(const k of ['KV_ENV','ALLOW_LOCAL_DEMO','KV_ADMIN_KEY','KV_PRODUCT_KEY','KV_ADMIN_ROLE'])delete process.env[k];}
});
