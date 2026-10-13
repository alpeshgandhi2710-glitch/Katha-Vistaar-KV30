'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'shared/localization-contract-v30.json'),'utf8'));
const languageCfg=JSON.parse(fs.readFileSync(path.join(ROOT,'website-first/config/languages.json'),'utf8'));
const localesDir=path.join(ROOT,'website-first/public/locales');
const keys=Object.keys(contract.keys);
const canonical=contract.canonicalLanguages;
const langs=['en',...languageCfg.languages.filter(x=>x.enabled===true).map(x=>x.code).filter(x=>x!=='en')];
const disabled=canonical.filter(code=>!langs.includes(code));
let missingKeyTotal=0,placeholderTotal=0,disabledPlaceholderTotal=0;const rows=[];
for(const code of canonical){const f=path.join(localesDir,`${code}.json`);const d=JSON.parse(fs.readFileSync(f,'utf8'));const tr=d.translations||{};const missing=keys.filter(k=>!(k in tr));const placeholders=code==='en'?[]:keys.filter(k=>tr[k]===`[${k}]`);const isEnabled=langs.includes(code);
if(isEnabled) { missingKeyTotal+=missing.length; placeholderTotal+=placeholders.length; } else { disabledPlaceholderTotal+=placeholders.length; }
rows.push({code,keys:Object.keys(tr).length,missing:missing.length,unreviewed:placeholders.length,enabled:isEnabled});}
console.log('==============================================');
console.log('KV30 — FINAL UI CONTRACT CATALOG AUDIT');
console.log('==============================================');
console.log(`Contract keys            : ${keys.length}`);
console.log(`Canonical languages      : ${canonical.length}`);
console.log(`Enabled UI languages     : ${langs.length}`);
console.log(`Disabled/scheduled       : ${disabled.length}`);
console.log(`Missing locale keys      : ${missingKeyTotal}`);
for(const r of rows)console.log(`${r.code.padEnd(5)} ${r.enabled?'ENABLED ':'DISABLED'} keys=${String(r.keys).padStart(4)} missing=${String(r.missing).padStart(3)} [key]=${String(r.unreviewed).padStart(3)}`);
console.log('==============================================');
console.log(`CATALOG KEY COMPLETENESS : ${missingKeyTotal===0?'PASS':'FAIL'}`);
console.log(`ENABLED LOCALE COVERAGE  : ${placeholderTotal===0?'CLOSED':'OPEN'} (${placeholderTotal} explicit [key] entries)`);
console.log(`DISABLED LOCALE [key]    : ${disabledPlaceholderTotal} (fallback-allowed, not release debt)`);
console.log('==============================================');
process.exitCode=missingKeyTotal===0?0:1;
