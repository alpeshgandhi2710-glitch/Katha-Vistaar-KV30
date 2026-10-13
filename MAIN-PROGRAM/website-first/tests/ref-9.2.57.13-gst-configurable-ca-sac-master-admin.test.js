'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createTaxGstProductionPolicy}=require('../core/tax-gst-production-policy');
const {createCustomerTaxEngine}=require('../core/customer-tax-engine');
const root=path.resolve(__dirname,'..');

function tempRoot(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-gst-'));
  fs.mkdirSync(path.join(dir,'config'));
  fs.copyFileSync(path.join(root,'config','tax-gst-production-matrix-v30.json'),path.join(dir,'config','tax-gst-production-matrix-v30.json'));
  return dir;
}

test('9.2.57.13 restores CA-SAC input + Master Admin approval without a mandatory CA recommendation object',()=>{
  const old=process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG;
  delete process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG;
  const dir=tempRoot();
  const policy=createTaxGstProductionPolicy(dir);
  assert.throws(()=>policy.saveApproved({legalBasis:{sacHeading:'9984',sacGroup:'99843',exactClassification:'CA-SUPPLIED-CLASS'},entries:[{state:'GUJARAT',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',rate:0,ruleVersion:'R1'}]},{role:'admin',adminId:'admin-test'}),e=>e.code==='tax_matrix_master_admin_required');
  const matrix=policy.saveApproved({legalBasis:{sacHeading:'CA-HEADING',sacGroup:'CA-GROUP',exactClassification:'CA-SUPPLIED-CLASS'},entries:[
    {state:'GUJARAT',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',rate:0,ruleVersion:'R1'},
    {state:'MAHARASHTRA',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',rate:18,ruleVersion:'R1'}
  ]},{role:'master_admin',adminId:'master-test'});
  assert.equal(matrix.status,'APPROVED');
  assert.equal(matrix.productionMatrix.isApproved,true);
  assert.equal(matrix.legalBasis.sacHeading,'CA-HEADING');
  assert.equal(matrix.approvalEvidence.caReference,null);
  const tax=createCustomerTaxEngine(dir);
  const gj=tax.calculate({amount:100,state:'GUJARAT',category:'subscription_purchase',at:'2026-09-23T00:00:00.000Z'});
  const mh=tax.calculate({amount:100,state:'MAHARASHTRA',category:'subscription_purchase',at:'2026-09-23T00:00:00.000Z'});
  assert.equal(gj.ok,true); assert.equal(gj.taxRate,0); assert.equal(gj.taxAmount,0); assert.equal(gj.chargeAmount,100);
  assert.equal(mh.ok,true); assert.equal(mh.taxRate,18); assert.equal(mh.taxAmount,18); assert.equal(mh.chargeAmount,118);
  fs.rmSync(dir,{recursive:true,force:true});
  if(old===undefined)delete process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG;else process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG=old;
});

test('9.2.57.13 production defaults remain fail-closed and do not invent SAC or GST rates',()=>{
  const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','tax-gst-production-matrix-v30.json'),'utf8'));
  assert.equal(cfg.status,'APPROVAL_REQUIRED');
  assert.equal(cfg.productionMatrix.isApproved,false);
  assert.deepEqual(cfg.productionMatrix.entries,[]);
  assert.equal(cfg.failClosedPolicy.onMissingOrUnapproved,'BLOCK_MONETIZATION');
  assert.equal(cfg.failClosedPolicy.allowFallbackInvent,false);
});
