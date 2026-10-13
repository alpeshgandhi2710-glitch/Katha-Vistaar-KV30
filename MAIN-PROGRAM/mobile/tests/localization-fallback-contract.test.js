const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'lib', 'main.dart'), 'utf8');
assert(main.includes("englishValues"), 'English catalog fallback map missing');
assert(main.includes("selected!='[$key]'"), 'explicit [key] selected-locale guard missing');
assert(main.includes("english!='[$key]'"), 'explicit [key] English guard missing');
assert(main.includes("return '[$key]';"), 'final diagnostic fallback missing');
const en = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'locales', 'en.json'), 'utf8')).translations;
const registry = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'locales', 'registry.json'), 'utf8')).languages;
assert.strictEqual(registry.length, 23, 'expected 23 registered locales');
let checked=0, bad=[];
for (const row of registry) {
  const code=String(row.code);
  const p=path.join(root,'assets','locales',`${code}.json`);
  const obj=JSON.parse(fs.readFileSync(p,'utf8')).translations;
  for (const [k,v] of Object.entries(obj)) {
    const selected=String(v ?? '').trim();
    const english=String(en[k] ?? '').trim();
    if ((!selected || selected===`[${k}]`) && (!english || english===`[${k}]`)) bad.push(`${code}:${k}`);
    checked++;
  }
}
assert.strictEqual(bad.length,0,`no English fallback for ${bad.slice(0,10).join(',')}`);
console.log(JSON.stringify({status:'PASS',registeredLocales:registry.length,localeFilesChecked:registry.length,translationEntriesChecked:checked,englishFallbackSource:'assets/locales/en.json',diagnosticFallback:'[key] only when selected and English unavailable'},null,2));
