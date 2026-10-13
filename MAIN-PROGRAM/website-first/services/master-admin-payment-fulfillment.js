'use strict';
const crypto=require('node:crypto');

// Master Admin controlled payment verification + exact-quantity fulfillment.
// AI may prepare/assess a verification, but cannot mint/transfer value without
// explicit Master Admin authority and a verified payment record.
function createMasterAdminPaymentFulfillment({requests,supply,coinLedger,paymentLedger,coinTransactions,stickerTransactions,users,stickerLots,acquireSticker,monetization,transactionVerifications,coreAudit,now,addCoinLot}={}){
 const ts=()=>typeof now==='function'?now():new Date().toISOString();
 const makeId=()=>`FUL-${crypto.randomBytes(7).toString('hex').toUpperCase()}`;
 function requireMaster(actor){if(String(actor?.role||actor)!=='master_admin')throw Object.assign(new Error('master_admin_required'),{code:'master_admin_required'});}
 function verifyPayment({actor,transactionId,userId,amount,paymentStatus='verified',aiAssessment='payment_verified_by_master_admin_ai'}){
   requireMaster(actor);
   const uid=String(userId||''),txid=String(transactionId||'');
   if(!uid||!txid)throw Object.assign(new Error('payment_reference_required'),{code:'payment_reference_required'});
   const existing=transactionVerifications.get(txid);
   if(existing?.status==='verified'&&existing.userId===uid)return {...existing,replayed:true};
   const n=Number(amount);
   const records=[...(paymentLedger?.list?.()||[]),...[...(coinTransactions?.values?.()||[])].flat(),...[...(stickerTransactions?.values?.()||[])].flat()];
   const tx=records.find(x=>String(x.paymentTransactionId||'')===txid&&Number(x.amount??x.totalCost??0)===n)||records.find(x=>String(x.id)===txid&&Number(x.amount??x.totalCost??0)===n);
   if(!tx||String(tx.userId||tx.from||'')!==uid||Number(tx.amount??tx.totalCost??0)!==n)throw Object.assign(new Error('payment_record_not_found_or_amount_mismatch'),{code:'payment_record_not_found_or_amount_mismatch'});
   if(!Number.isFinite(n)||n<=0)throw Object.assign(new Error('invalid_payment_amount'),{code:'invalid_payment_amount'});
   const row={id:`VER-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,transactionId:txid,userId:uid,amount:n,status:paymentStatus==='verified'?'verified':'review',verificationMode:'master_admin_ai_under_human_authority',aiAssessment:String(aiAssessment),verifiedBy:actor.adminId||'master_admin',createdAt:ts()};
   transactionVerifications.set(txid,row);
   coreAudit?.record({actor:actor.adminId||'master_admin',action:'master_admin_ai_payment_verification',resourceType:'payment',resourceId:txid,result:row.status});
   return row;
 }
 function available(assetType,assetId){const key=`${assetType}:${assetId||'coin'}`;const n=supply?.get(key);return n===undefined||n===null?Infinity:Math.max(0,Math.floor(Number(n)));}
 function setAvailable({actor,assetType,assetId,quantity}){requireMaster(actor);const qty=quantity===null||quantity===undefined?null:Math.floor(Number(quantity));if(qty!==null&&qty<0)throw Object.assign(new Error('invalid_supply_quantity'),{code:'invalid_supply_quantity'});const key=`${assetType}:${assetId||'coin'}`;if(qty===null)supply.delete(key);else supply.set(key,qty);coreAudit?.record({actor:actor.adminId||'master_admin',action:'master_admin_supply_policy_changed',resourceType:'asset_supply',resourceId:key,result:qty===null?'unlimited':'limited',quantity:qty});return {key,quantity:qty};}
 function consumeSupply(assetType,assetId,quantity){const key=`${assetType}:${assetId||'coin'}`,n=supply?.get(key);if(n===undefined||n===null)return;const next=Math.max(0,Math.floor(Number(n))-Math.floor(Number(quantity)));supply.set(key,next);}
 function queue({actor,userId,assetType,assetId,quantity,paymentTransactionId,paymentAmount,reason='insufficient_available_quantity'}){
   requireMaster(actor);
   const qty=Math.floor(Number(quantity));
   if(!['coin','sticker'].includes(String(assetType))||qty<=0)throw Object.assign(new Error('invalid_fulfillment_quantity'),{code:'invalid_fulfillment_quantity'});
   const uid=String(userId||'');if(!users.has(uid))throw Object.assign(new Error('user_not_found'),{code:'user_not_found'});
   const key=`${uid}:${assetType}:${assetId||'coin'}:${paymentTransactionId}`;
   const prior=[...requests.values()].find(x=>x.idempotencyKey===key&&x.status!=='reversed');
   if(prior)return {...prior,replayed:true};
   const row={id:makeId(),idempotencyKey:key,userId:uid,assetType:String(assetType),assetId:String(assetId||''),quantity:qty,paymentTransactionId:String(paymentTransactionId||''),paymentAmount:Number(paymentAmount||0),reason:String(reason),status:'pending_payment_verification',createdAt:ts(),updatedAt:ts()};
   requests.set(row.id,row);return row;
 }
 function fulfill({actor,requestId,verificationId}){
   requireMaster(actor);
   const row=requests.get(String(requestId||''));if(!row)throw Object.assign(new Error('fulfillment_request_not_found'),{code:'fulfillment_request_not_found'});
   if(row.status==='fulfilled')return {...row,replayed:true};
   const verification=[...transactionVerifications.values()].find(v=>v.id===String(verificationId||'')||v.transactionId===row.paymentTransactionId);
   if(!verification||verification.status!=='verified'||verification.userId!==row.userId)throw Object.assign(new Error('payment_verification_required'),{code:'payment_verification_required'});
   const user=users.get(row.userId);if(!user)throw Object.assign(new Error('user_not_found'),{code:'user_not_found'});
   if(row.assetType==='coin'){
     coinLedger.credit(user,row.quantity,{type:'master_admin_payment_fulfillment',fulfillmentId:row.id,paymentTransactionId:row.paymentTransactionId,generatedBy:'master_admin_ai_under_human_authority'});addCoinLot?.(user,{source:'paid_purchase_fulfillment',sourceTransactionId:row.paymentTransactionId,coins:row.quantity,paidAmountInr:Number(row.paymentAmount||0),unitValueInr:row.quantity>0?Number(row.paymentAmount||0)/row.quantity:0,provenance:'master_admin_verified_coin_purchase'});
   }else{
     const def=monetization.sticker(row.assetId);if(!def)throw Object.assign(new Error('sticker_not_found'),{code:'sticker_not_found'});
     for(let i=0;i<row.quantity;i++)acquireSticker(user,row.assetId,{source:'master_admin_payment_fulfillment',costCoins:Number(def.costCoins||0),economicBasisInr:Number(row.paymentAmount||0)/Math.max(1,row.quantity),sourceTransactionId:row.paymentTransactionId,rootSourceTransactionId:row.paymentTransactionId,provenance:`master_admin_sticker_fulfillment:${row.paymentTransactionId}`});
   }
   consumeSupply(row.assetType,row.assetId,row.quantity);
   const linkedMaps=row.assetType==='coin'?coinTransactions:stickerTransactions;
   if(linkedMaps){for(const [k,v] of linkedMaps.entries()){const rows=Array.isArray(v)?v:[v];for(const linked of rows){if(String(linked?.paymentTransactionId||'')!==String(row.paymentTransactionId||''))continue;if(linked.status==='pending_master_admin_fulfillment'||linked.status==='pending_payment_verification'){linked.status='paid';linked.fulfillmentId=row.id;linked.fulfilledAt=ts();linked.fulfillmentVerificationId=verification.id;}}linkedMaps.set(k,Array.isArray(v)?rows:rows[0]);}}
   row.status='fulfilled';row.verificationId=verification.id;row.fulfilledBy=actor.adminId||'master_admin';row.fulfilledAt=ts();row.updatedAt=row.fulfilledAt;
   coreAudit?.record({actor:actor.adminId||'master_admin',action:'master_admin_payment_fulfillment',resourceType:row.assetType,resourceId:row.id,result:'fulfilled',quantity:row.quantity});
   return {...row};
 }
 return {verifyPayment,queue,fulfill,available,setAvailable,consumeSupply};
}
module.exports={createMasterAdminPaymentFulfillment};
