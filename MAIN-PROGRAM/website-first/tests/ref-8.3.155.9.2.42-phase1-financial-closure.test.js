'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const managed=require('../core/managed-monetization');

test('Phase-1 content-premium and bundle entitlements are versioned and content-scoped',()=>{
 const engine=require('../core/entitlement-engine');
 const bundleMembership={version:'test-fixture',status:'approved_test_only',bundles:[{bundleId:'bundle-1',active:true,contentIds:['c1','c2']}]};
 const user={id:'u1',subscriptions:{},subscriptionRecords:{bundle_plan:{planId:'bundle_plan',status:'active',expiresAt:new Date(Date.now()+86400000).toISOString(),planSnapshot:{id:'bundle_plan',type:'bundle',contentIds:['c1','c2'],bundleId:'bundle-1',accessScope:'bundle:bundle-1',entitlementKey:'bundle_plan',adFree:true}}}};
 assert.equal(engine.hasContentEntitlement(user,{id:'c1'},Date.now(),bundleMembership),true);
 assert.equal(engine.hasContentEntitlement(user,{id:'c3'},Date.now(),bundleMembership),false);
 assert.equal(engine.decide(user,{id:'c1',type:'story',workType:'novel',partNumber:16,seriesId:'s1'},Date.now(),bundleMembership).reason,'content_entitlement');
 assert.equal(engine.decide(user,{id:'c3',type:'story',workType:'novel',partNumber:16,seriesId:'s1'}).allowed,false);
});

test('Phase-1 managed subscription plans preserve content-scoped and bundle metadata',()=>{
 const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kv-sub-plan-'));fs.mkdirSync(path.join(tmp,'config'),{recursive:true});fs.mkdirSync(path.join(tmp,'data'),{recursive:true});
 fs.writeFileSync(path.join(tmp,'config','managed-monetization.json'),JSON.stringify({version:'30',subscriptions:[],royalty:{},coinPacks:[],offers:[],ads:{},stickers:[]}));
 const m=managed.createManagedMonetization(tmp,{record(){}}); const row=m.upsertSubscription('master_admin',{id:'bundle-test',label:'Bundle test',type:'bundle',price:0,durationDays:1,contentIds:['c1','c2'],bundleId:'b1'});
 assert.deepEqual(row.contentIds,['c1','c2']);assert.equal(row.bundleId,'b1');
});

test('Phase-1 production code has no business-value fallback in content access or royalty GST resolver',()=>{
 const access=fs.readFileSync(path.join(root,'..','backend','src','services','content-access-policy.js'),'utf8');
 const royalty=fs.readFileSync(path.join(root,'core','royalty-engine.js'),'utf8');
 assert.doesNotMatch(access,/dailyProgressHours:24/);
 assert.doesNotMatch(access,/\?\?24/);
 const royaltyCfg=JSON.parse(fs.readFileSync(path.join(root,'config','royalty-gst-v30.json'),'utf8'));
 assert.equal(royaltyCfg.status,'approval_required');
 assert.equal(royaltyCfg.defaultRate,null);
 assert.deepEqual(royaltyCfg.stateOverrides,{});
 assert.match(royalty,/royalty_gst_rule_not_approved/);
});

test('Phase-1 tax gate is wired to authoritative customer-tax resolver without inventing production rates',()=>{
 const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','managed-monetization.json'),'utf8'));
 assert.match(server,/createCustomerTaxEngine/);
 assert.match(server,/customerCharge\(user,amount,'coin_purchase'\)/);
 assert.match(server,/customerCharge\(user,chargeAmount,'subscription_purchase'\)/);
 assert.match(server,/platform_subscription_formula_approval_required/);
 assert.equal(cfg.tax.status,'approved_policy_source_driven');
 assert.equal(cfg.tax.checkout.enforcement,'disabled');
 assert.deepEqual(cfg.tax.rules,[]);
});
