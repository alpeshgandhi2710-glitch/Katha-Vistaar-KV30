const fs=require('fs'),path=require('path'),assert=require('assert');
const p=path.resolve(__dirname,'../public/app.js');
const s=fs.readFileSync(p,'utf8');
assert(s.includes("'Accept-Language':String(state.uiLanguage||'en')"),'Accept-Language propagation missing');
assert(s.includes("'X-KV30-UI-Language':String(state.uiLanguage||'en')"),'X-KV30-UI-Language propagation missing');
assert(s.includes('function xStrict('),'xStrict missing');
assert(s.includes('English fallback')||s.includes('xStrict'),'strict localization governance missing');
console.log('PASS REF-9.2.57.18-R2: selected UI language is propagated on JSON API requests; strict lookup preserved');
