const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','account-admin-localization-rule-v30.json'),'utf8'));
const languages=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
function ok(name,cond){if(!cond)throw new Error(name);console.log(`PASS ${name}`)}
ok('23-language base UI catalog',languages.every(l=>new RegExp(`\\b${l}\\s*:`).test(app)));
for(const k of cfg.newBaseKeys) ok(`base key ${k} governed`,app.includes(`${k}:`));
for(const k of cfg.newDomainKeys) ok(`domain key ${k} governed`,app.includes(`${k}:`));
const scopedFns=['renderProfileMenu','loadReaderDashboard','loadAuthorDashboard','performAdminLogout','loadAdminDashboard','securityAuditPage'];
for(const fn of scopedFns){const m=app.match(new RegExp(`(?:async )?function ${fn}\\([^\\n]*|function ${fn}\\([^\\n]*`));ok(`function present: ${fn}`,!!m);}
for(const raw of ['Reader Dashboard','Author Dashboard','Message Box','Subscription & Billing','Coins & Stickers','Log out admin','Creator / Author Contract Rights','No creator works yet.','Use fingerprint / face / passkey','Theme, font and reading comfort.','App, web and email delivery.','Security Audit Ledger','Run Security AI']){const idx=app.indexOf(raw);const catalogEnd=app.indexOf('function x(');const isCatalog=idx>=0&&idx<catalogEnd;ok(`raw literal only allowed in catalog: ${raw}`,idx<0||isCatalog);}
ok('future-language extensibility rule',cfg.extensibility.includes('registry'));
ok('master control immutable rule',cfg.masterControl==='IMMUTABLE');
console.log('R31 account/admin localization governance PASS');
