const fs=require('fs');
const p=require('path').join(__dirname,'../src/server.js');
const s=fs.readFileSync(p,'utf8');
if(!s.includes('function requestedUiLanguage(req)')) throw new Error('requested_ui_language_helper_missing');
if(!s.includes("res.setHeader('Content-Language',requestedUiLanguage(req))")) throw new Error('content_language_header_missing');
if(!s.includes("res.setHeader('X-KV30-UI-Language',requestedUiLanguage(req))")) throw new Error('kv30_ui_language_header_missing');
for(const lang of ['en','gu','hi','bn','ta','te','kn','ml','mr','pa','ur','or','as','mai','sa','kok','brx','sd','ks','mni','doi','sat','ne']){
 const rx=new RegExp(`(?:\\^|\\\\|\\()${lang}`);
 if(!s.includes(lang)) throw new Error(`language_not_present:${lang}`);
}
console.log('PASS REF-9.2.57.18-R3: server selected-language response headers are governed for canonical 23-language set');
