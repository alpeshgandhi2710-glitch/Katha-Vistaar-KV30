const crypto=require('node:crypto');
function id(prefix){return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;}
function text(v,max=2000){return String(v??'').trim().slice(0,max);}
function createPaymentDocumentManager({paymentDocuments,purchaseRequests,purchaseOrders,purchaseInvoices,procurementPayments}){
 function save(row){paymentDocuments.set(row.id,row);return row;}
 function generate(input,actor){
  const type=text(input.type,40).toLowerCase();
  if(!['purchase_request','payment_advice','invoice'].includes(type)) throw new Error('unsupported_document_type');
  const sourceId=text(input.sourceId,120);
  let source=null;
  if(type==='purchase_request') source=purchaseRequests.get(sourceId);
  if(type==='payment_advice') source=procurementPayments.get(sourceId);
  if(type==='invoice') source=purchaseInvoices.get(sourceId);
  if(!source) throw new Error('source_document_not_found');
  const row={id:id(type==='payment_advice'?'PAD':type==='invoice'?'INV':'PRD'),type,sourceId,version:1,status:'generated',generatedBy:actor,generatedAt:new Date().toISOString(),titleKey:type==='payment_advice'?'paymentAdvice':type==='invoice'?'invoice':'purchaseRequest',payload:JSON.parse(JSON.stringify(source)),format:'application/json'};
  return save(row);
 }
 function get(idValue){return paymentDocuments.get(String(idValue||''))||null;}
 function listBySource(sourceId){return [...paymentDocuments.values()].filter(x=>x.sourceId===String(sourceId)).sort((a,b)=>String(b.generatedAt).localeCompare(String(a.generatedAt)));}
 return {generate,get,listBySource};
}
module.exports={createPaymentDocumentManager};
