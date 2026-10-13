const assert=require('node:assert/strict');
const path=require('node:path');
const {createServiceManager}=require('../services/service-manager');
const root=path.resolve(__dirname,'..');
const m=createServiceManager(root,{NODE_ENV:'test'});
const matrix=m.twoSwitchMatrix();
assert.equal(matrix.coreServiceCount,18);
assert.equal(matrix.services.length,18);
assert.equal(matrix.reservedServicesExcludedFrom18Count.length,5);
assert.equal(matrix.internalLayer,'always_on');
assert.equal(matrix.externalDefaultEnabled,false);
for(const row of matrix.services){
  assert.ok(row.serviceSwitch);
  assert.equal(row.masterAdminControlled,true);
  assert.equal(row.internalAlwaysOn,true);
  assert.equal(row.externalDefaultEnabled,false);
  assert.equal(row.firewallRequired,true);
  assert.deepEqual(row.failureOrder,['primary','secondary_slot_1','secondary_slot_2','secondary_slot_3','internal_fallback']);
  assert.equal(row.secondarySlots.length,3);
  assert.deepEqual(row.secondarySlots.map(x=>x.slot),[1,2,3]);
}
const email=m.matrixEntry('email'); assert.ok(email && email.serviceId==='email');
(async()=>{
 const r=await m.safeCallWithFallbackAsync('email',[()=>{throw new Error('primary_fail')},()=>{throw new Error('secondary1_fail')},()=>{throw new Error('secondary2_fail')},()=>{throw new Error('secondary3_fail')}],'INTERNAL_OK',{actor:'master_admin'});
 assert.equal(r.ok,false); assert.equal(r.layer,'internal'); assert.equal(r.value,'INTERNAL_OK'); assert.equal(r.attempts.length,4);
 console.log('REF-8.3.155.9.2.8 external two-switch matrix PASS');
})().catch(e=>{console.error(e);process.exit(1)});
