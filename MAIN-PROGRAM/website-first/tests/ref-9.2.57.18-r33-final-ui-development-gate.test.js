const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','ui-final-development-gate-v30.json'),'utf8'));
function ok(n,c){if(!c)throw new Error(n);console.log('PASS '+n)}
ok('gate rule exists',cfg.rule==='NO_NEW_USER_FACING_UI_WITHOUT_GOVERNED_LOCALIZATION');
ok('dev production parity',cfg.environmentRule.includes('same localization source'));
ok('mobile shared contract',cfg.mobileRule.includes('same semantic localization key contract'));
ok('future language extensibility',cfg.extensibility.includes('no hard-coded 23-language ceiling'));
ok('smart hub governed',app.includes("x('smartHubDescription')")&&app.includes("x('smartCreationReadingHub')"));
ok('ad support copy governed',app.includes("x('supportCreatorsExplore')"));
ok('voice UI governed',app.includes("x('voiceToTextUnavailable')")&&app.includes("x('listeningSpeakNow')"));
ok('confirmation UI governed',app.includes("x('cancel')")&&app.includes("x('allow')"));
ok('calendar server sends titleKey',server.includes("titleKey:'creatorOfficeHours'")&&server.includes("titleKey:'writingWeek'")&&server.includes("titleKey:'audioFmWeek'"));
ok('calendar UI resolves titleKey',app.includes("x(e.titleKey||'eventTitle')"));
ok('master control immutable',cfg.masterControl==='IMMUTABLE');
console.log('R33 final UI development gate PASS');
