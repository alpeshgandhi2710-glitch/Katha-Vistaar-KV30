const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../src/services/identity-management');
const e=require('../src/services/entitlements');
test('one non-deleted login per identity; locked still blocks a new login',()=>{
 const i=m.createIdentity({label:'staff'});
 const l=m.createLogin(i,{actorRole:'admin',role:'admin',username:'a'});
 assert.equal(l.status,'pending_admin');
 m.grantAdminRights(l,true); m.lockLogin(l);
 assert.equal(m.statusMeaning('locked'),'Login is temporarily blocked; identity slot remains occupied.');
 assert.equal(m.canCreateAnother(i),false);
 assert.throws(()=>m.createLoginAfterDeletion(i,{role:'user'}),/identity_already_has_login/);
});
test('deleted login reopens identity slot and new login is distinct',()=>{
 const i=m.createIdentity(); const l=m.createLogin(i,{actorRole:'admin',username:'first'});m.deleteLogin(l);
 const n=m.createLoginAfterDeletion(i,{role:'user',username:'second'});
 assert.notEqual(n.id,l.id); assert.equal(n.status,'active');
});
test('only master admin can create additional login',()=>{
 const i=m.createIdentity(); m.createLogin(i,{actorRole:'admin',username:'first'}); 
 assert.throws(()=>m.createAdditionalLogin(i,{actorRole:'admin'}),/master_admin_required/);
});
test('complimentary staff subscriptions do not count as profit',()=>{
 const i=m.createIdentity(); const l=m.createLogin(i,{actorRole:'master_admin',role:'admin',username:'staff'});m.grantAdminRights(l,true);e.grantDefaultStaff(l);
 assert.equal(e.commercialCount(l,'app'),0); assert.equal(e.complimentaryCount(l,'app'),1); assert.equal(l.entitlements.app.profit,0);
});

test('deactivated and suspended logins still occupy identity slot',()=>{const i=m.createIdentity();const l=m.createLogin(i,{actorRole:'admin'});m.deactivateLogin(l);assert.equal(m.canCreateAnother(i),false);m.deleteLogin(l);const n=m.createLoginAfterDeletion(i,{role:'user'});m.suspendLogin(n);assert.equal(m.canCreateAnother(i),false);});
