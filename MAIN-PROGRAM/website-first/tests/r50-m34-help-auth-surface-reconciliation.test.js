const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const http=require('http');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const {server}=require(path.join(root,'src','server.js'));
function request(port,method,pathName,body,cookie){return new Promise((resolve,reject)=>{const data=body===undefined?null:Buffer.from(JSON.stringify(body));const req=http.request({host:'127.0.0.1',port,path:pathName,method,headers:{'Content-Type':'application/json',...(data?{'Content-Length':data.length}:{}),...(cookie?{Cookie:cookie}:{})}},r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:s,json:()=>JSON.parse(s)}));});req.on('error',reject);if(data)req.write(data);req.end();});}
function cookie(r){return String(r.headers['set-cookie']?.[0]||'').split(';')[0]}
async function registerAndLogin(port,name){const e=`${name}@example.test`;let r=await request(port,'POST','/api/auth/register',{username:name,userId:name,email:e,mobile:'88877766'+String(name).slice(-2),name:'Help Test',password:'secret1',confirmPassword:'secret1',verificationMethod:'email'});assert.equal(r.status,201);const j=r.json();r=await request(port,'POST','/api/auth/verify-otp',{target:e,purpose:'register-email',otp:j.demoOtp});assert.equal(r.status,200);r=await request(port,'POST','/api/auth/login',{identifier:name,password:'secret1'});assert.equal(r.status,200);return cookie(r)}
test('M34 public Help UI uses dedicated public-help contract and stays login-free',()=>{const m=app.match(/async function initPublicAiHelp\(\)[\s\S]*?(?=\nasync function )/);assert.ok(m);const fn=m[0];assert.match(fn,/getJSON\('\/api\/help\/public-ai'/);assert.doesNotMatch(fn,/getJSON\('\/api\/ai\/help'/);assert.match(app,/publicAiHelpForm/);assert.match(app,/publicAccountStateForm/);assert.match(app,/publicTicketTrackForm/);});
test('M34 anonymous and authenticated Help AI surfaces remain distinct with separate public and authenticated ticket contracts',async()=>{const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;try{let r=await request(port,'POST','/api/help/public-ai',{problem:'I did not receive my OTP',language:'en'});assert.equal(r.status,200);assert.equal(r.json().loggedIn,false);assert.equal(r.json().ai.category,'account');r=await request(port,'POST','/api/help/public-ticket',{identifier:'m34-public@example.test',channel:'ai',problem:'I need account support'});assert.equal(r.status,201);assert.equal(r.json().ticket.contactVerified,false);const c=await registerAndLogin(port,'m34help01');r=await request(port,'POST','/api/ai/help',{problem:'I need help with my account',language:'en'},c);assert.equal(r.status,200);assert.equal(r.json().ok,true);r=await request(port,'GET','/api/help/context',undefined,c);assert.equal(r.status,200);assert.equal(r.json().loggedIn,true);r=await request(port,'POST','/api/help/tickets',{channel:'ai',problem:'I need a human support ticket'},c);assert.equal(r.status,201);assert.equal(r.json().ticket.contactVerified,true);}finally{await new Promise(resolve=>srv.close(resolve))}});

test('M34 public Help can create, track and comment on login/registration/OTP support tickets with a claimed contact',async()=>{
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
 try{
  let r=await request(port,'POST','/api/help/public-ticket',{identifier:'help-user@example.test',problem:'I did not receive the registration OTP',channel:'ai',language:'en'});
  assert.equal(r.status,201);const created=r.json();assert.equal(created.loggedIn,false);assert.match(created.ticket.id,/^KVH-/);assert.equal(created.ticket.contactVerified,false);assert.equal(created.ticket.contactType,'email');
  const tid=created.ticket.id;
  r=await request(port,'GET',`/api/help/tickets/track?ticketNumber=${encodeURIComponent(tid)}&identifier=${encodeURIComponent('help-user@example.test')}`);assert.equal(r.status,200);assert.equal(r.json().ticket.id,tid);
  r=await request(port,'PATCH','/api/help/public-ticket',{ticketNumber:tid,identifier:'help-user@example.test',comment:'I tried again and still did not receive the OTP.'});assert.equal(r.status,200);assert.equal(r.json().ticket.comments.length,1);assert.equal(r.json().ticket.comments[0].visibility,'user');
  r=await request(port,'GET',`/api/help/tickets/track?ticketNumber=${encodeURIComponent(tid)}&identifier=${encodeURIComponent('wrong@example.test')}`);assert.equal(r.status,403);
  r=await request(port,'POST','/api/help/public-ticket',{identifier:'+919876543210',problem:'Registration is failing before account creation',channel:'ai',language:'en'});assert.equal(r.status,201);assert.equal(r.json().ticket.contactType,'mobile');
 }finally{await new Promise(resolve=>srv.close(resolve))}
});
