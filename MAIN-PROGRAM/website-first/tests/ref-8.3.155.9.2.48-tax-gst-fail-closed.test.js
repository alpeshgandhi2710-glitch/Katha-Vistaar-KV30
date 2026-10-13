'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createTaxGstProductionPolicy}=require('../core/tax-gst-production-policy');
const {createCustomerTaxEngine}=require('../core/customer-tax-engine');
const {monetizationGate}=require('../../backend/src/services/content-access-policy');
const root=path.resolve(__dirname,'..');

test('9.2.48 canonical GST matrix starts approval-required and fails closed',()=>{
  const file=path.join(root,'config','tax-gst-production-matrix-v30.json');
  const cfg=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(cfg.status,'APPROVAL_REQUIRED');
  assert.equal(cfg.productionMatrix.isApproved,false);
  assert.deepEqual(cfg.productionMatrix.entries,[]);
  assert.equal(cfg.failClosedPolicy.onMissingOrUnapproved,'BLOCK_MONETIZATION');
  assert.equal(cfg.failClosedPolicy.allowFallbackInvent,false);
  delete process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG;
  assert.equal(monetizationGate()?.error,'TAX_MATRIX_NOT_APPROVED');
  const policy=createTaxGstProductionPolicy(root);
  assert.equal(policy.assertApproved().error,'TAX_MATRIX_NOT_APPROVED');
  const tax=createCustomerTaxEngine(root);
  assert.equal(tax.calculate({amount:100,state:'GUJARAT',category:'subscription_purchase'}).error,'TAX_MATRIX_NOT_APPROVED');
});

test('9.2.48 approval writes evidence and enables config-driven tax resolution without source edits',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-tax-'));
  fs.mkdirSync(path.join(dir,'config'));
  fs.copyFileSync(path.join(root,'config','tax-gst-production-matrix-v30.json'),path.join(dir,'config','tax-gst-production-matrix-v30.json'));
  const policy=createTaxGstProductionPolicy(dir);
  const matrix=policy.saveApproved({legalBasis:{notificationNo:'LEGAL-TEST-1',notificationDate:'2026-09-18',sacHeading:'9984',sacGroup:'99843',exactClassification:'LEGAL-CLASS'},entries:[{state:'GUJARAT',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:'2027-01-01T00:00:00.000Z',rate:0,taxInclusive:false,ruleVersion:'LEGAL-1',sourceReference:'TEST-SOURCE-1',sourceChecksum:'TEST-CHECKSUM-1'}],legalReviewer:'CA/Legal Test',evidenceReferences:['EVIDENCE-1'],sourceSnapshot:{sourceUrl:'https://example.invalid/test-tax-source',checksum:'TEST-SNAPSHOT-CHECKSUM',capturedAt:'2026-09-23T00:00:00.000Z'}},{role:'master_admin',adminId:'master-test'});
  assert.equal(matrix.status,'APPROVED');
  assert.equal(matrix.productionMatrix.isApproved,true);
  assert.equal(matrix.productionMatrix.approvedBy,'master-test');
  assert.equal(matrix.approvalEvidence.legalReviewer,'CA/Legal Test');
  const tax=createCustomerTaxEngine(dir);const result=tax.calculate({amount:100,state:'GUJARAT',category:'subscription_purchase',at:'2026-09-18T00:00:00.000Z'});
  assert.equal(result.ok,true);assert.equal(result.taxRate,0);assert.equal(result.taxAmount,0);assert.equal(result.chargeAmount,100);
  fs.rmSync(dir,{recursive:true,force:true});
});
