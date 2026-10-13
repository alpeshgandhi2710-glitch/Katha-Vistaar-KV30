const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
test('deep static guard: core page builders are unique and release identity is consistent',()=>{
 const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
 for(const name of ['discover','categoriesPage','mediaPage','categoryChipBar']){
  const n=(app.match(new RegExp(`function\\s+${name}\\s*\\(`,'g'))||[]).length;
  assert.equal(n,1,`${name} must have exactly one definition`);
 }
 const v=JSON.parse(fs.readFileSync(path.join(ROOT,'config','version.json'),'utf8'));
 assert.equal(v.release_ref,v.current_release_ref);
 const m=JSON.parse(fs.readFileSync(path.join(ROOT,'RELEASE-MANIFEST-v30.json'),'utf8'));
 assert.equal(m.version,'KV30-P2-30W');
});
test('deep static guard: canonical 22 Indian language registry retains Nepali',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(ROOT,'config','languages.json'),'utf8'));
 const codes=d.languages.map(x=>x.code);
 assert.equal(codes.length,22);
 for(const c of ['gu','hi','bn','mr','ta','te','kn','ml','pa','or','as','ur','ks','sd','ne','sa','kok','doi','mni','brx','sat','mai']) assert.ok(codes.includes(c),`missing ${c}`);
});

test('deep static guard: managed reader plans have canonical entitlement scopes',()=>{
 const m=require(path.join(ROOT,'core','managed-monetization.js'));
 const api=m.createManagedMonetization(ROOT,{record(){}});
 const plans=api.get().subscriptions;
 const expected={app_reader:'app',comic_reader:'comic',fm_reader:'audio',reel_reader:'reel'};
 for(const [id,scope] of Object.entries(expected)){const p=plans.find(x=>x.id===id);assert.ok(p,`missing ${id}`);assert.equal(p.accessScope,scope,`${id} access scope`)}
});


test('30A every profile-menu routeLink has a canonical route path', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const map = src.match(/const ROUTE_PATHS=\{([\s\S]*?)\};/);
  assert.ok(map, 'ROUTE_PATHS missing');
  const keys = new Set([...map[1].matchAll(/(?:^|,)\s*[\'\"]?([A-Za-z0-9_-]+)[\'\"]?\s*:/g)].map(m => m[1]));
  const used = [...src.matchAll(/routeLink\([\'\"]([^\'\"]+)[\'\"]/g)].map(m => m[1]);
  const missing = [...new Set(used.filter(k => !keys.has(k)))];
  assert.deepEqual(missing, []);
});
