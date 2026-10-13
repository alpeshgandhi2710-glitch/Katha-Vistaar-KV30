const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const ROOT=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const langConfig=JSON.parse(fs.readFileSync(path.join(ROOT,'config','languages.json'),'utf8'));
const appMetaMatch=app.match(/const LANGUAGE_DISPLAY_METADATA=(\{.*?\});\nasync function loadConfig\(\)/s);
assert.ok(appMetaMatch,'LANGUAGE_DISPLAY_METADATA must be present before loadConfig');
const meta=JSON.parse(appMetaMatch[1]);

test('23 canonical languages have non-empty picker labels',()=>{
  assert.equal(langConfig.languages.length,22);
  const canonical=[{code:'en',name:'English',nativeName:'English'},...langConfig.languages];
  assert.equal(Object.keys(meta).length,23);
  for(const row of canonical){
    assert.equal(meta[row.code]?.name,row.name,`${row.code}: English name mismatch`);
    assert.equal(meta[row.code]?.nativeName,row.nativeName,`${row.code}: native name mismatch`);
    assert.ok(String(meta[row.code].nativeName).trim(),`${row.code}: native label blank`);
    assert.ok(String(meta[row.code].name).trim(),`${row.code}: English label blank`);
  }
});

test('language picker renders both native and English labels from state',()=>{
  assert.match(app,/list\.innerHTML=state\.languages\.map\(x=>`<button[^`]*<span>\$\{esc\(x\.nativeName\)\}<\/span><small>\$\{esc\(x\.name\)\}<\/small>/s);
  assert.match(app,/const canonicalLanguages=canonicalCodes\.map\(code=>\(\{\.\.\.LANGUAGE_DISPLAY_METADATA\[code\]/);
});

test('English locale has no self-referential x() placeholder values',()=>{
  const en=JSON.parse(fs.readFileSync(path.join(ROOT,'public','locales','en.json'),'utf8')).translations;
  const bad=Object.entries(en).filter(([k,v])=>typeof v==='string' && /\$\{\s*x\(['\"]/.test(v));
  assert.deepEqual(bad,[]);
});

test('all 23 locale bundles have the governed 1130-key catalog',()=>{
  const files=fs.readdirSync(path.join(ROOT,'public','locales')).filter(x=>x.endsWith('.json')).sort();
  assert.equal(files.length,23);
  for(const file of files){
    const b=JSON.parse(fs.readFileSync(path.join(ROOT,'public','locales',file),'utf8'));
    assert.equal(Object.keys(b.translations||{}).length,1130,file);
  }
});
