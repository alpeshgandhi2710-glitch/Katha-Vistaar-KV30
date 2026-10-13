const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const {server,VERSION}=require('../src/server');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:d}))});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end()})}
function cookieFrom(r){return r.headers['set-cookie']?.[0]?.split(';')[0]||''}

test('P2-30B logout is server-confirmed and client does not hide failures',async()=>{const s=http.createServer(server).listen(0);try{const port=s.address().port;const login=await req(port,'POST','/api/auth/login',{identifier:'kv-demo',password:'Demo123!'});assert.equal(login.status,200);const cookie=cookieFrom(login);assert.ok(cookie);const me=await req(port,'GET','/api/auth/me');assert.equal(me.status,200);const out=await req(port,'POST','/api/auth/logout',null,cookie);assert.equal(out.status,200);assert.deepEqual(JSON.parse(out.body),{ok:true,loggedOut:true,sessionInvalidated:true,uiLanguage:'en'});const after=await req(port,'GET','/api/auth/me',null,cookie);assert.equal(JSON.parse(after.body).authenticated,false);assert.match(js,/function performLogout\(\)/);assert.match(js,/session_still_active/);assert.doesNotMatch(js,/getJSON\('\/api\/auth\/logout'\)\;state\.user=null/)}finally{s.close()}});

test('P2-30B public author profile API is login-free and returns only public profile fields',async()=>{const s=http.createServer(server).listen(0);try{const port=s.address().port;const pub=await req(port,'GET','/api/profile/public?userId=system');assert.equal(pub.status,200);const j=JSON.parse(pub.body);assert.equal(j.profile.username,'katha_vistaar');assert.equal(j.profile.name,'Katha Vistaar Team');assert.equal(j.profile.verified,true);assert.ok(Array.isArray(j.works));assert.equal(j.profile.email,undefined);assert.equal(j.profile.mobile,undefined);const login=await req(port,'POST','/api/auth/login',{identifier:'kv-demo',password:'Demo123!'});const cookie=cookieFrom(login);const pub2=await req(port,'GET','/api/profile/public?userId=demo-user',null,cookie);assert.equal(pub2.status,200);const j2=JSON.parse(pub2.body);assert.equal(j2.profile.username,'kv-demo');assert.equal(j2.profile.email,undefined);assert.equal(j2.profile.mobile,undefined)}finally{s.close()}});

test('P2-30B content author names are clickable public-profile links and viewer author is linked',()=>{assert.match(js,/data-public-profile=/);assert.match(js,/\/profile\?userId=\$\{encodeURIComponent\(authorId\)\}/);assert.match(js,/function openPublicProfile\(userId\)/);assert.match(js,/loadPublicProfile\(\)/);assert.match(js,/viewer-author-line/);assert.match(css,/\.author-link/);assert.match(css,/\.public-profile-card/)});

test('P2-30B profile actions follow the login rule and messaging remains follow-gated',()=>{assert.match(js,/data-open-login>\$\{t\('login'\)\} · \$\{x\('followAuthor'\)\}/);assert.match(js,/publicProfileFollow/);assert.match(js,/publicProfileSubscribe/);assert.match(js,/d\.canMessage/);});

test('P2-30B version identity and recovery-key safety remain current',()=>{assert.equal(VERSION,'KV30-P2-30W');const src=fs.readFileSync(path.join(root,'src/server.js'),'utf8');assert.match(src,/KV_ADMIN_KEY/);assert.doesNotMatch(src,/KV_MASTER_ADMIN_KEY\s*=\s*['"][^'\"]+['"]/);});
