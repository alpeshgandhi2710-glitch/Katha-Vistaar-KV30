const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const PACKAGE_ROOT=path.resolve(__dirname,'../..');
const {server,VERSION}=require('../src/server');
const ROOT=path.resolve(__dirname,'..');
function req(port,method,path,body,cookie){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const r=http.request({port,method,path,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>resolve({status:res.statusCode,body:b,headers:res.headers}))});r.on('error',reject);if(data)r.write(data);r.end()})}
async function start(){const s=http.createServer(server);await new Promise(r=>s.listen(0,r));return s}

test('P2-30B auth UI has direct Login, separate Register/Forgot/Reset screens, and OTP resend',()=>{
 const html=fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8');
 const js=fs.readFileSync(path.join(ROOT,'public/app.js'),'utf8');
 assert.match(html,/id="loginIdentifier"/);
 assert.match(html,/type="submit" data-i18n="login">LOGIN/);
 assert.match(html,/id="register"/);
 assert.match(html,/id="forgotPasswordDialog"/);
 assert.match(html,/id="resetPasswordDialog"/);
 assert.match(html,/id="otpDialog"/);
 assert.match(html,/id="otpResend" data-i18n="resendOtp">Resend Code/);
 assert.match(html,/id="registerConfirmPassword"/);
 assert.match(html,/data-password-toggle="registerPassword"/);
 assert.match(html,/data-password-toggle="registerConfirmPassword"/);
 assert.match(html,/data-password-toggle="loginPassword"/);
 assert.match(html,/data-password-toggle="resetNewPassword"/);
 assert.match(html,/data-password-toggle="resetConfirmPassword"/);
 assert.match(js,/function togglePasswordVisibility/);
 assert.match(js,/function startOtpTimer/);
 assert.match(js,/passwordMismatch/);
 assert.match(js,/function openForgotPassword\(\)/);
 assert.match(js,/function handleForgotPasswordSubmit\(e\)/);
 assert.match(js,/function handleResetPasswordSubmit\(e\)/);
 assert.match(js,/function humanAuthError\(code\)/);
});

test('P2-30B public Settings keeps basic appearance/language usable without login',()=>{
 const js=fs.readFileSync(path.join(ROOT,'public/app.js'),'utf8');
 assert.match(js,/function settings\(\)/);
 assert.match(js,/if\(!state\.user\)return page\(t\('settings'\)/);
 assert.match(js,/settingTheme/);
 assert.match(js,/settingFont/);
 assert.match(js,/settingsLanguage/);
 assert.match(js,/populateReadingLanguage\(\)/);
});

test('P2-30B local demo direct login works for username, email and mobile identifiers',async()=>{
 assert.equal(VERSION,'KV30-P2-30W');
 const s=await start();
 try{
  for(const identifier of ['kv-demo','demo.user@kathavistaar.test','9999900001']){
   const r=await req(s.address().port,'POST','/api/auth/login',{identifier,password:'Demo123!'});
   assert.equal(r.status,200,identifier);
   assert.equal(JSON.parse(r.body).authenticated,true);
  }
 }finally{s.close()}
});


test('P2-30B registration and reset reject mismatched confirmation passwords',async()=>{
 const s=await start();
 try{
  const port=s.address().port;
  const reg=await req(port,'POST','/api/auth/register',{username:'confirmtest'+Date.now(),email:'confirm'+Date.now()+'@example.com',password:'secret1',confirmPassword:'secret2'});
  assert.equal(reg.status,400);assert.equal(JSON.parse(reg.body).error,'password_mismatch');
 }finally{s.close()}
});

test('P2-30W register-v2 requires confirmation, uses stored OTP, and creates the user only after verification',async()=>{
 const s=await start();
 try{
  const port=s.address().port, suffix=Date.now(), email=`r40v2-${suffix}@example.com`, username=`r40v2${suffix}`;
  let r=await req(port,'POST','/api/register-v2',{email,username,password:'secret1'});
  assert.equal(r.status,400);assert.equal(JSON.parse(r.body).error,'confirmPassword_required');
  r=await req(port,'POST','/api/register-v2',{email,username,password:'secret1',confirmPassword:'secret2'});
  assert.equal(r.status,400);assert.equal(JSON.parse(r.body).error,'password_mismatch');
  r=await req(port,'POST','/api/register-v2',{email,username,password:'secret1',confirmPassword:'secret1'});
  assert.equal(r.status,200);const startBody=JSON.parse(r.body);assert.equal(startBody.need_otp,true);assert.equal(startBody.auto_otp,'123456');
  r=await req(port,'POST','/api/register-v2',{email,username,password:'secret1',confirmPassword:'secret1',otp:'000000'});
  assert.equal(r.status,400);assert.equal(JSON.parse(r.body).error,'invalid_otp');
  r=await req(port,'POST','/api/register-v2',{email,username,password:'secret1',confirmPassword:'secret1',otp:'123456'});
  assert.equal(r.status,201);assert.equal(JSON.parse(r.body).auto_verified,true);
 }finally{s.close()}
});


test('P2-30B language API exposes 22 Indian languages plus separate English UI option',async()=>{
 const s=await start();try{const r=await req(s.address().port,'GET','/api/languages');assert.equal(r.status,200);const j=JSON.parse(r.body);assert.equal(j.indianLanguages.length,0);assert.equal(j.languages.length,1);assert.equal(j.languages[0].code,'en');assert.equal(j.uiLanguageCount,1);assert.ok(j.canonicalLanguageCount>=23);}finally{s.close()}
});

test('P2-30B unverified local demo reaches login OTP and resend',async()=>{
 const s=await start();
 try{
  const port=s.address().port;
  const login=await req(port,'POST','/api/auth/login',{identifier:'kv-otp',password:'Demo123!'});
  assert.equal(login.status,403);
  assert.equal(JSON.parse(login.body).error,'verification_required');
  const send=await req(port,'POST','/api/auth/send-otp',{identifier:'kv-otp'});
  assert.equal(send.status,200);const sj=JSON.parse(send.body);assert.equal(sj.purpose,'login-mobile');assert.equal(sj.demoOtp,'123456');
  const resend=await req(port,'POST','/api/auth/resend-otp',{target:'9999900002',purpose:'login-mobile'});
  assert.equal(resend.status,200);assert.equal(JSON.parse(resend.body).demoOtp,'123456');
  const verify=await req(port,'POST','/api/auth/verify-login-otp',{target:'9999900002',purpose:'login-mobile',otp:'123456'});
  assert.equal(verify.status,200);assert.equal(JSON.parse(verify.body).authenticated,true);
 }finally{s.close()}
});


test('P2-30B public subscription and coin/sticker catalog is readable without login',async()=>{
 const s=await start();try{const port=s.address().port;
  const cat=await req(port,'GET','/api/monetization/catalog');assert.equal(cat.status,200);const j=JSON.parse(cat.body);assert.equal(j.loginRequiredForPurchase,true);assert.ok(j.policy.subscriptions.length>=2);assert.ok(j.policy.coinPacks.length>=2);assert.ok(j.policy.stickers.length>=15);assert.ok(!('adminPermissions' in j.policy));
  const st=await req(port,'GET','/api/stickers');assert.equal(st.status,200);const sj=JSON.parse(st.body);assert.equal(sj.loggedIn,false);assert.equal(sj.loginRequiredForPurchase,true);assert.equal(sj.coins,null);assert.ok(sj.catalog.length>=20);
 }finally{s.close()}
});

test('P2-30B active source contains no stale release references and backup programs are present',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push(p)}}walk(path.resolve(__dirname,'..','..'));
 for(const f of files.filter(x=>!x.includes('Katha Vistaar Extra') && !x.includes('/tests/') && !x.includes('/05-PHASE-REPORTS/') && !x.includes('/data/') && !x.includes('/node_modules/'))){const txt=fs.readFileSync(f,'utf8');assert.doesNotMatch(txt,/KV30-P2-0(?:8|9A|9B|9C|9D)\b/);}
 assert.match(fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8'),/\/api\/admin\/backup\/snapshot/);
 assert.match(fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8'),/\/api\/admin\/backup\/restore/);
 assert.match(fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8'),/KV_BACKUP_ENCRYPTION_KEY/);
});
