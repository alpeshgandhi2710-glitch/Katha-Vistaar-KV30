const fs=require('fs');
const path=require('path');
const assert=require('assert');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','src','server.js'),'utf8');

assert.match(app,/function hasDirectTranslation\(k,lang=state\.uiLanguage\)/);
assert.match(app,/function localizedApiMessage\(payload,code\)/);
assert.match(app,/payload\?\.messageKey\|\|code/);
assert.match(app,/err\.userMessage=localizedApiMessage\(e,code\)/);
assert.match(app,/Accept-Language/);
assert.match(app,/X-KV30-UI-Language/);
assert.match(server,/if\(!payload\.messageKey&&payload\.error\)payload\.messageKey=String\(payload\.error\)/);
assert.match(server,/payload\.uiLanguage=String\(res\.getHeader\('X-KV30-UI-Language'\)\|\|'en'\)/);
assert.match(server,/res\.setHeader\('Content-Language',requestedUiLanguage\(req\)\)/);

console.log('PASS REF-9.2.57.18-R5: API messageKey -> localized UI error plumbing + language headers');
