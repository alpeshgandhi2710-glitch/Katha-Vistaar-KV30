const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const appPath=path.join(__dirname,'..','public','app.js');
const htmlPath=path.join(__dirname,'..','public','index.html');
const serverPath=path.join(__dirname,'..','src','server.js');
const app=fs.readFileSync(appPath,'utf8');
const html=fs.readFileSync(htmlPath,'utf8');
const server=fs.readFileSync(serverPath,'utf8');
// Execute only the English extra.en catalog assignments; no browser APIs are required.
const blocks=[...app.matchAll(/Object\.assign\(extra\.en,\{[\s\S]*?\}\);/g)].map(m=>m[0]);
const ctx={extra:{en:{}},x:()=>''};
vm.createContext(ctx); for(const b of blocks) vm.runInContext(b,ctx);
const en=ctx.extra.en;
const indic=/[\u0900-\u0D7F]/;
assert.strictEqual(Object.entries(en).filter(([k,v])=>typeof v==='string'&&indic.test(v)).length,0,'English catalog contains Indic-script text');
const keyLeaks=Object.entries(en).filter(([k,v])=>typeof v==='string'&&v===k&&/^(ui_|final_)/.test(k));
assert.strictEqual(keyLeaks.length,0,`English UI key values remain: ${keyLeaks.map(x=>x[0]).join(',')}`);
const visible={
 ui_get_safe_contextual_internal_ai_guidance:'Get safe, contextual internal AI guidance',
 ui_help_tickets_and_policy_guidance:'Help tickets and policy guidance',
 ui_registered_email_mobile:'Registered email / mobile',
 ui_submit_to_master_admin:'Submit to Master Admin',
 ui_track_ticket_number:'Ticket number',
 ui_track_ticket:'Track ticket',
 audio:'FM / Audio',sampleContent:'Sample content',sampleParts:'Sample parts',aiStoryboard:'AI Storyboard',notificationCenter:'Notifications',submit:'Submit',viewCompetition:'View competition',sortBy:'Sort by',applyFilters:'Apply filters',searchResults:'Search results',phoneSettings:'Phone settings',final_previous:'Previous',final_next:'Next',final_mark_as_read:'Mark as read'
};
for(const [k,v] of Object.entries(visible)) assert.strictEqual(en[k],v,`English catalog mismatch: ${k}`);
assert(/document\.querySelectorAll\('\[data-route\]'\)/.test(app),'route buttons are not bound');
assert(/document\.querySelectorAll\('\[data-open-login\]'\)/.test(app),'login action binding missing');
assert(/document\.querySelectorAll\('\[data-register\]'\)/.test(app),'register action binding missing');
assert(/if\(route==='login'\)setTimeout\(openLogin,0\)/.test(app),'direct login route does not open login');
assert(/if\(route==='register'\)setTimeout\(openRegister,0\)/.test(app),'direct register route does not open register');
assert(/if\(p==='\/reg'\)return 'register'/.test(app),'legacy /reg route missing');
assert(/'\/login','\/register','\/reg'/.test(server),'server SPA direct routes missing');
assert(html.includes('data-register'),'register control missing from HTML');
assert(html.includes('id="openLogin"'),'login control missing from HTML');
console.log(`PASS user-visible UI smoke: English catalog clean; visible broken labels corrected; route/login/register bindings present; direct SPA routes covered.`);
