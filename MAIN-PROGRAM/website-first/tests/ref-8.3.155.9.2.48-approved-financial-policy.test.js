'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRoyaltyEngine}=require('../core/royalty-engine');
const root=path.resolve(__dirname,'..');

test('approved platform subscription formula allocates net pool by eligible consumption share',()=>{
 const e=createRoyaltyEngine(root,{events:new Map(),ledger:new Map(),gstConfig:{kind:'royalty_payout',status:'approved',defaultRate:0,stateOverrides:{}}});
 const a=e.calculatePlatformAuthorAllocation({eligibleRevenue:1000,tax:100,fees:50,refunds:0,consumptionUnits:3,totalConsumptionUnits:10,platformSubscriptionRate:0.4,creatorId:'c',transactionId:'t'});
 assert.equal(a.eligibleRevenue,850); assert.equal(a.creatorRoyaltyPool,340); assert.equal(a.consumptionShare,0.3); assert.equal(a.allocation,102);
});

test('approved policy is configuration-driven and exposes no immutable business formula',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'config','managed-monetization.json'),'utf8'));
 assert.equal(m.royalty.platformSubscriptionFormulaStatus,'approved');
 assert.equal(m.royalty.platformSubscriptionAllocationFormula.version,'KV30-SUB-ALLOC-1.0');
 assert.equal(m.royalty.platformSubscriptionAllocationFormula.hardcodedBusinessFormulaForbidden,true);
 assert.equal(m.royalty.stickerRefundChargebackPolicy.status,'approved');
 assert.equal(m.royalty.taxPolicyApproval.status,'approved_policy_source_driven');
 assert.equal(m.royalty.tdsWithholdingPolicy.status,'approved_policy_source_driven');
});

test('tax and withholding activation remain source-driven and fail closed without an authoritative snapshot',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'config','managed-monetization.json'),'utf8'));
 const f=JSON.parse(fs.readFileSync(path.join(root,'config','financial-charges-v30.json'),'utf8'));
 assert.equal(m.tax.checkout.enforcement,'disabled');
 assert.equal(m.tax.approval.inventedRateForbidden,true);
 assert.equal(f.charges.tds_withholding.rate,null);
 assert.equal(f.activation.includes('approved_source_snapshot'),true);
});
