const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
test('Phase 2 mobile UX exposes public navigation and a working logout action',()=>{
 for(const label of ['Stories','Comics','FM','Reels','Discover','Categories','Subscriptions','Coins & Stickers','Help']) assert.match(html,new RegExp(label.replace(/[-/]/g,'\\$&')));
 assert.match(js,/data-logout/);
 assert.match(js,/\/api\/auth\/logout/);
 assert.match(js,/state\.user=null/);
 assert.match(js,/render\('home'\)/);
});


test('Phase 2 OTP dialog has a complete resend/cancel contract and safe DOM guards',()=>{
 assert.match(html,/id="otpDialog"/);
 assert.match(html,/id="otpCode"/);
 assert.match(html,/id="otpResend"/);
 assert.match(js,/\/api\/auth\/resend-otp/);
 assert.match(js,/function cancelOtpDialog\(\)/);
 assert.match(js,/otp_dialog_incomplete/);
 assert.match(js,/if\(!m\)return;/);
});

test('Phase 2 mobile UX keeps format filters usable and avoids oversized chip/icon rules',()=>{
 assert.match(js,/function categoryChipBar\(type\)/);
 assert.match(js,/CATEGORIES_BY_TYPE\[type\]/);
 assert.match(js,/data-category-type=/);
 assert.match(js,/content-type-nav/);
 assert.match(js,/format-icon/);
 assert.match(fs.readFileSync(path.join(root,'public/style.css'),'utf8'),/overflow-x:auto/);
});


test('Phase 2 local acceptance login can reach OTP and resend without an external provider',()=>{
 const source=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
 assert.match(source,/username==='kv-demo'/);
 assert.match(source,/\/api\/auth\/resend-otp/);
 assert.match(js,/function sendOtpAndOpen\(\{target/);assert.match(js,/otpOptions/);
 assert.match(js,/showPreRoll\('audio','fm'/);
});

test('Phase 2 pre-roll coverage includes Story, Comic, FM and Reel placements',()=>{
 assert.match(js,/showPreRoll\('video','story'/);
 assert.match(js,/showPreRoll\('video','comic'/);
 assert.match(js,/showPreRoll\('audio','fm'/);
 assert.match(js,/showPreRoll\('video','reel'/);
});
