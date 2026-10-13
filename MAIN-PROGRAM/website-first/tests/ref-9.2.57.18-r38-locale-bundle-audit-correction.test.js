const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const langCfg=JSON.parse(fs.readFileSync(path.join(root,'config','languages.json'),'utf8'));
const enabled=['en',...langCfg.languages.filter(x=>x.enabled===true).map(x=>x.code).filter(x=>x!=='en')];
const disabled=langCfg.languages.filter(x=>x.enabled!==true).map(x=>x.code);
const localesDir=path.join(root,'public','locales');
const langs=fs.readdirSync(localesDir).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)).sort();
assert.strictEqual(langs.length,23,'must have 23 locale bundles');
const en=JSON.parse(fs.readFileSync(path.join(localesDir,'en.json'),'utf8')).translations;
const englishCatalogCount=Object.keys(en).length;
assert.ok(englishCatalogCount>0,'authoritative English catalog must contain a non-empty current inventory');
let missing=0, placeholders=0;
for(const lang of langs){
  const d=JSON.parse(fs.readFileSync(path.join(localesDir,lang+'.json'),'utf8')).translations;
  for(const key of Object.keys(en)){
    if(!(key in d)) missing++;
    if(lang!=='en' && d[key]===`[${key}]`) placeholders++;
  }
}
assert.strictEqual(missing,0,'locale bundle catalog keys must be complete');
assert.strictEqual(enabled.length,1,'current production UI should enable English only until non-English bundles are complete/reviewed');
assert.strictEqual(disabled.length,22,'all 22 scheduled non-English UI locales should remain disabled until support evidence is complete');
let enabledPlaceholders=0;
for(const lang of enabled){
  const d=JSON.parse(fs.readFileSync(path.join(localesDir,lang+'.json'),'utf8')).translations;
  for(const key of Object.keys(en)){ if(lang!=='en' && d[key]===`[${key}]`) enabledPlaceholders++; }
}
assert.strictEqual(enabledPlaceholders,0,'enabled production locales must have no [key] placeholders');
assert.ok(placeholders>0,'disabled partial locale bundles may retain explicit [key] values as review debt');
const audit=fs.readFileSync(path.join(root,'scripts','audit-translations.js'),'utf8');
assert.ok(audit.includes('localeBundles'),'audit must include runtime locale bundles');
assert.ok(audit.includes('state.localeBundles') || audit.includes('public/locales'),'audit source must account for locale-bundle precedence');
console.log(`R38 locale-bundle/fallback correction PASS — 23/23 bundles × ${englishCatalogCount} keys; enabled UI locales=${enabled.length}; disabled scheduled locales=${disabled.length}; missing catalog keys=${missing}; enabled [key] entries=${enabledPlaceholders}; disabled [key] entries=${placeholders}.`);
