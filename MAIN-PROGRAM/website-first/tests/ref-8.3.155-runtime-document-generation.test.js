const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPaymentDocumentManager}=require('../services/payment-document-manager');
test('runtime purchase request and payment advice document generation is real and persisted in the document map',()=>{
 const maps={paymentDocuments:new Map(),purchaseRequests:new Map(),purchaseOrders:new Map(),purchaseInvoices:new Map(),procurementPayments:new Map()};
 maps.purchaseRequests.set('PR-1',{id:'PR-1',status:'submitted',subtotal:100});
 maps.procurementPayments.set('PPAY-1',{id:'PPAY-1',invoiceId:'PINV-1',amount:118,status:'recorded'});
 const d=createPaymentDocumentManager(maps);
 const pr=d.generate({type:'purchase_request',sourceId:'PR-1'},'admin-1');
 assert.equal(pr.status,'generated'); assert.equal(pr.type,'purchase_request'); assert.deepEqual(d.get(pr.id).payload,{id:'PR-1',status:'submitted',subtotal:100});
 const pa=d.generate({type:'payment_advice',sourceId:'PPAY-1'},'master_admin');
 assert.equal(pa.type,'payment_advice'); assert.equal(pa.payload.amount,118); assert.equal(d.listBySource('PPAY-1').length,1);
});
