const fs=require('fs');const path=require('path');const assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
const locales=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
for(const k of ['aiStory','aiComic','aiFm','aiReel','crossFormat','sourceLanguage','targetLanguage','transform','aiVoice']){
  for(const lang of locales)assert(new RegExp(`(?:^|\\n)\\s*${lang}:\\{[^\\n]*${k}:`).test(app)||new RegExp(`Object\\.assign\\(extra\\.${lang}[^\\n]*${k}:`).test(app),`${lang} missing governed key ${k}`);
}
for(const label of ['x(\'storyboard\')','x(\'timeline\')','x(\'captions\')','x(\'aiStory\')','x(\'aiComic\')','x(\'aiFm\')','x(\'aiReel\')','x(\'crossFormat\')'])assert(app.includes(label),`missing UI wiring ${label}`);
assert(app.includes("/api/ai/cross-format-transform"),'cross-format proposal UI route missing');
assert(app.includes("/api/ai/cross-format-transform/apply"),'cross-format apply UI route missing');
assert(app.includes("/api/media/tts"),'AI voice UI route missing');
assert(server.includes("sourceLanguage=String(b.sourceLanguage||'en')"),'source language not accepted by transform route');
assert(server.includes("targetLanguage=String(b.targetLanguage||b.language||'en')"),'target language not accepted by transform route');
assert(server.includes("u.pathname==='/api/ai/cross-format-transform/apply'"),'cross-format apply route missing');
assert(server.includes("creatorApproval:true"),'apply route missing explicit creator approval context');
assert(server.includes("cross_format_transform_applied"),'cross-format apply audit missing');
assert(server.includes("u.pathname==='/api/media/tts'"),'TTS route missing');
console.log('PASS REF-9.2.57.18-R15: 4 AI format entry points × 23 locales; shared Storyboard/Timeline/Captions; cross-language cross-format proposal+approved-draft path; AI Voice path');
