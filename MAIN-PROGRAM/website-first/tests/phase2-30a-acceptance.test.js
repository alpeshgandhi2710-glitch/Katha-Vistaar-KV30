const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const {server,VERSION}=require('../src/server');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:d}))});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end()})}
function cookieFrom(r){const c=r.headers['set-cookie']?.[0]||'';return c.split(';')[0]}

test('P2-30B premium public navigation exposes Notifications and correct route bindings',()=>{
 assert.match(html,/data-route="notifications"/);
 assert.match(html,/href="\/notifications" data-route="notifications"/);
 assert.match(js,/item\('notifications'/);
 assert.match(js,/item\('subscriptions'/);
 assert.match(js,/item\('stickers'/);
 assert.doesNotMatch(js,/d\.catalog\.map\(x=>`<article/);
 assert.match(css,/header-icon-actions/);
});

test('P2-30B public Internal AI Help answers login assistance without exposing a ticket',async()=>{
 const s=http.createServer(server).listen(0);try{const r=await req(s.address().port,'POST','/api/help/public-ai',{problem:'I did not receive my OTP',language:'en'});assert.equal(r.status,200);const j=JSON.parse(r.body);assert.equal(j.loggedIn,false);assert.equal(j.ai.category,'account');assert.match(j.ai.reply,/OTP/i);assert.equal(j.ticket,undefined)}finally{s.close()}
});

test('P2-30B device biometric/passkey flow is WebAuthn-based, not a fake client flag',()=>{
 assert.match(html,/passkeyLogin/);
 assert.match(js,/navigator\.credentials\.get/);
 assert.match(js,/navigator\.credentials\.create/);
 const serverSource=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
 for(const route of ['/api/auth/passkey/register/options','/api/auth/passkey/register/verify','/api/auth/passkey/login/options','/api/auth/passkey/login/verify']) assert.match(serverSource,new RegExp(route.replaceAll('/','\\/')));
 assert.match(serverSource,/crypto\.verify\('sha256'/);
});

test('P2-30B subscription checkout is a separate payment step',()=>{
 assert.match(js,/state\.pendingSubscriptionPlan/);
 assert.match(js,/navigate\('payments'\)/);
 assert.match(js,/function loadPaymentPage\(\)/);
 assert.match(js,/x\('ui_continue_to_payment'\)/);
 assert.match(js,/internal_test/);
 assert.match(js,/mode:method==='internal_test'\?'internal_test':'external'/);
});

test('P2-30B public settings, filters and loginless catalog remain reachable',()=>{
 assert.match(js,/if\(!state\.user\)return page\(t\('settings'\)/);
 assert.match(js,/function categoryChipBar\(type\)/);
 assert.match(js,/function typeSelector\(type\)/);
 assert.match(js,/function subscriptionBillingPage\(\)/);
 assert.match(js,/function stickersPage\(\)/);
});

test('P2-30B release identity is consistent in active code',()=>{
 assert.equal(VERSION,'KV30-P2-30W');
 const active=[];
 function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n);if(['Katha Vistaar Extra','p2_09e_old','admin_input'].includes(n))continue;const st=fs.lstatSync(p);if(st.isSymbolicLink())continue;if(st.isDirectory())walk(p);else if(/\.(js|json|md|txt|html|css|yaml|lock)$/.test(n))active.push(p)}}
 walk(path.resolve(root,'..'));
 for(const f of active){if(path.basename(f)===path.basename(__filename))continue;const t=fs.readFileSync(f,'utf8');assert.doesNotMatch(t,/KV30-P2-0[0-9][A-Z]/,'stale numbered P2 release in '+f)}
});
