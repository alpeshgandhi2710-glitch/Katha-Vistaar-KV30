const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const langs=JSON.parse(fs.readFileSync(path.join(root,'config','languages.json'),'utf8')).languages;
const dir=path.join(root,'public','locales');
assert.strictEqual(langs.length,22,'scheduled Indian language registry must contain 22 languages');
assert.ok(fs.existsSync(path.join(dir,'en.json')),'English locale bundle missing');
for(const row of langs){
  const file=path.join(dir,`${row.code}.json`);
  assert.ok(fs.existsSync(file),`locale bundle missing: ${row.code}`);
  const b=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.strictEqual(b.languageCode,row.code,`bundle language mismatch: ${row.code}`);
  assert.ok(b.translations && typeof b.translations==='object',`translations missing: ${row.code}`);
  assert.ok(b.reviewStatus,'reviewStatus missing');
}
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
assert.ok(app.includes('state.localeBundles?.[lang]?.translations?.[key]'),'locale bundle must have runtime precedence');
assert.ok(app.includes('if(!enabled)return localeValue(\'en\',key)??key'),'unsupported/unavailable language uses English fallback');
assert.ok(app.includes("if(v==null||String(v).trim()===''||String(v).trim()===`[${key}]`)v=localeValue('en',key);"),'missing/empty/placeholder values must use English fallback');
console.log('R26 locale bundle governance PASS — 23/23 bundles present; dynamic precedence; strict fallback semantics verified.');
