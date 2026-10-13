'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const managed=JSON.parse(fs.readFileSync(path.join(root,'config','managed-monetization.json'),'utf8'));
const entitlement=JSON.parse(fs.readFileSync(path.join(root,'config','subscription-entitlement.json'),'utf8'));
assert.ok(Array.isArray(managed.subscriptions)&&managed.subscriptions.length>0);
assert.ok(Array.isArray(entitlement.plans)&&entitlement.plans.length>0);
const managedIds=new Set(managed.subscriptions.map(x=>x.id));
for(const p of managed.subscriptions){
 assert.equal(typeof p.entitlementKey,'string',`missing entitlementKey:${p.id}`);
 assert.equal(typeof p.accessScope,'string',`missing accessScope:${p.id}`);
 assert.equal(typeof p.active,'boolean',`missing active:${p.id}`);
}
for(const p of entitlement.plans){
 if(managedIds.has(p.id)){ const m=managed.subscriptions.find(x=>x.id===p.id); assert.equal(p.entitlementKey,m.entitlementKey,`legacy family mapping mismatch:${p.id}`); }
}
const src=fs.readFileSync(path.join(root,'core','entitlement-engine.js'),'utf8');
assert.match(src,/record\.planSnapshot\|\|configured/);
assert.match(src,/record\.status!=='active'/);
console.log('PASS entitlement family/version snapshot contract');
