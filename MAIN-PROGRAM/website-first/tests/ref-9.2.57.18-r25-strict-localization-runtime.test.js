const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
assert.match(src,/function xStrict\(key,lang=state\.uiLanguage\)/,'xStrict missing');
assert.match(src,/function x\(k\)\{let v=xStrict\(k,state\.uiLanguage\)/,'x() must route through strict lookup');
assert(!/function x\(k\).*\(extra\.en\|\|\{\}\)\[k\].*\(T\.en\|\|\{\}\)\[k\]/.test(src),'x() still contains direct English fallback chain');
assert.match(src,/function humanAuthError\(code\).*xStrict\(key,state\.uiLanguage\)/,'auth error UI must use strict localized lookup');
assert.match(src,/if\(v==null\|\|String\(v\)\.trim\(\)===''\|\|String\(v\)\.trim\(\)===`\[\$\{key\}\]`\)v=localeValue\('en',key\);/,'missing/empty/placeholder values must fall back to English');
console.log('PASS R25 reconciled localization runtime: x() and auth-error rendering use governed English fallback for missing/empty/placeholder values.');
