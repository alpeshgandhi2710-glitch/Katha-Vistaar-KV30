const fs=require('fs'); const path=require('path');
const root=path.join(__dirname,'..');
const dir=path.join(root,'public','locales');
const en=JSON.parse(fs.readFileSync(path.join(dir,'en.json'),'utf8')).translations;
const langs=fs.readdirSync(dir).filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5));
if(langs.length!==23) throw new Error(`locale count ${langs.length}`);
let reused=0;
for(const lang of langs.filter(x=>x!=='en')){ const d=JSON.parse(fs.readFileSync(path.join(dir,lang+'.json'),'utf8')).translations; for(const [k,v] of Object.entries(en)){ if(d[k]===undefined){ const alias=Object.keys(en).find(a=>a!==k&&en[a]===v&&typeof d[a]==='string'&&d[a]!==v); if(alias&&d[alias]) reused++; } } }
// This check is informationally strict: any remaining aliasable missing key is a source-coverage defect.
if(reused!==0) throw new Error(`aliasable missing keys remain: ${reused}`);
console.log(`R36 existing-reviewed translation reuse PASS; 23 locale bundles; no aliasable missing keys remain.`);
