const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const registry=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','shared','persistence-registry.json'),'utf8'));
const server=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');

test('P2-30N canonical persistence registry is complete, unique and wired to runtime maps',()=>{
  assert.equal(registry.release,'KV30-P2-30W');
  assert.equal(registry.schemaVersion,'1.15');
  assert.equal(registry.maps.length,63);
  assert.equal(new Set(registry.maps).size,registry.maps.length);
  const m=server.match(/const persistenceMaps=\{([^}]+)\};/);
  assert.ok(m,'runtime persistence map declaration missing');
  const runtime=[...m[1].matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*,?/g)].map(x=>x[1]).filter(x=>x!=='languageRegistryStore');
  assert.deepEqual(new Set(runtime),new Set(registry.maps));
  assert.equal(runtime.length,registry.maps.length);
});

test('P2-30N persistence registry rejects an unregistered map instead of hiding the error',()=>{
  const persistence=fs.readFileSync(path.join(__dirname,'../core/persistence.js'),'utf8');
  assert.match(persistence,/persistence_registry_missing:\$\{name\}/);
  assert.match(persistence,/persistence_registry_duplicate/);
});
