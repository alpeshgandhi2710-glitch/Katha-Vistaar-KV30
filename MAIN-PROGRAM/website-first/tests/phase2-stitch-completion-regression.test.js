const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'public','style.css'),'utf8');

test('Stitch completion keeps the supplied v30 visual system wired into Home/Profile/Settings',()=>{
 assert.match(app,/stitch-home-hero/);
 assert.match(app,/public-profile-card/);
 assert.match(app,/settings-card/);
 assert.match(css,/\.stitch-home-hero/);
 assert.match(css,/\.public-profile-card/);
 assert.match(css,/\.settings-card/);
});

test('All newly used SVG icons are defined in the canonical icon registry',()=>{
 const used=[...app.matchAll(/kvIcon\('([a-zA-Z0-9_-]+)'\)/g)].map(m=>m[1]);
 const body=app.slice(app.indexOf('function kvIcon'));
 const names=new Set([...body.matchAll(/(?:['\"])?([a-zA-Z0-9_-]+)(?:['\"])?\s*:/g)].map(m=>m[1]));
 const missing=[...new Set(used)].filter(x=>!names.has(x));
 assert.deepEqual(missing,[]);
});

test('Creator Studio AI actions are real governed API requests, not status-only fake buttons',()=>{
 assert.match(app,/async function runStudioAI\(type,request\)/);
 assert.match(app,/\/api\/ai\/creator-assist/);
 assert.match(app,/studioAiVisual.*runStudioAI/s);
 assert.match(app,/studioAiAudio.*runStudioAI/s);
 assert.match(app,/studioAiReel.*runStudioAI/s);
 assert.doesNotMatch(app,/studioAiVisual[^\n]*textContent='Internal AI visual layout proposal created/);
});

test('Authentication UI still exposes real six-box OTP and password recovery controls',()=>{
 assert.match(html,/data-otp-digit/);
 assert.match(html,/forgotPasswordForm/);
 assert.match(html,/resetPasswordForm/);
 assert.match(app,/function initOtpBoxes/);
 assert.match(app,/function handleForgotPasswordSubmit/);
 assert.match(app,/function handleResetPasswordSubmit/);
});

test('Author links continue to target the public profile route',()=>{
 assert.match(app,/data-public-profile=.*authorId/);
 assert.match(app,/\/profile\?userId=\$\{encodeURIComponent\(authorId\)\}/);
 assert.match(app,/function loadPublicProfile/);
});

test('Explicit logout remains server-backed and no automatic timeout was introduced',()=>{
 assert.match(app,/\/api\/auth\/logout/);
 assert.match(app,/function performLogout/);
 assert.doesNotMatch(app,/automatic.{0,40}(logout|timeout)/i);
 assert.doesNotMatch(app,/auto.?logout.{0,40}(timer|timeout)/i);
});

test('Interactive message composition uses the application dialog helper, not browser prompt',()=>{
 assert.match(app,/function composeMessage\(peer=''/);
 assert.match(app,/uiPrompt\(x\('recipientUserId'\)\)/);
 assert.match(app,/uiPrompt\(x\('messagePrompt'\)\)/);
 assert.doesNotMatch(app,/\bprompt\s*\(/);
 assert.doesNotMatch(app,/\balert\s*\(/);
 assert.doesNotMatch(app,/\bconfirm\s*\(/);
});

test('Current release remains the approved 30A identity across package and active source',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
 assert.equal(pkg.version,'KV30-P2-30W');
 assert.match(app,/P2-30B/);
});
