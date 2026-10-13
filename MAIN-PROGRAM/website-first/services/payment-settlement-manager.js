'use strict';
const crypto=require('node:crypto');
const AUTHORITATIVE=new Set(['settled','captured','paid']);
const FAILURE=new Set(['failed','rejected','declined','error','cancelled','canceled','refunded','refund','chargeback','reversed']);
function normalizeStatus(v){return String(v||'').trim().toLowerCase();}
function classifyProviderResult(result={}){
 const status=normalizeStatus(result.status||result.state||result.paymentStatus||result.result);
 const debited=result.debited===true||result.captured===true||result.sourceDebitConfirmed===true||result.charged===true;
 const refunded=result.refunded===true||result.refund===true||['refunded','refund','chargeback','reversed'].includes(status);
 const authoritative=AUTHORITATIVE.has(status)&&debited&&!refunded;
 if(authoritative)return {state:'settled',authoritative:true,debited,refunded:false};
 if(refunded)return {state:'refunded',authoritative:false,debited,refunded:true};
 if(debited&&FAILURE.has(status))return {state:'debit_confirmed',authoritative:false,debited,refunded:false};
 if(status==='accepted'||status==='processing'||status==='pending'||!status)return {state:'reconciliation_required',authoritative:false,debited,refunded:false};
 return {state:'not_debited',authoritative:false,debited:false,refunded:false};
}
function resolveSettlementDestination({environment=process.env.NODE_ENV,configuredDestination}={}){
 const env=String(environment||'').toLowerCase();
 if(env==='test'||env==='development'||env==='')return String(configuredDestination||process.env.KV_INTERNAL_TEST_SETTLEMENT_DESTINATION||'internal_test_ledger');
 return String(configuredDestination||'').trim()||null;
}
function recoveryKey(input){return String(input.direction||'internal')+':'+String(input.referenceId||'');}
function createRecovery(input){const key=recoveryKey(input);return {id:'REC-'+crypto.createHash('sha256').update(key).digest('hex').slice(0,14).toUpperCase(),recoveryKey:key,direction:String(input.direction||'internal'),referenceId:String(input.referenceId||''),operation:String(input.operation||'payment_recovery'),transactionId:input.transactionId?String(input.transactionId):null,providerTransactionId:input.providerTransactionId?String(input.providerTransactionId):null,amount:Number.isFinite(Number(input.amount))?Number(input.amount):null,userId:input.userId?String(input.userId):null,reason:input.reason?String(input.reason).slice(0,500):null,paymentType:input.paymentType?String(input.paymentType):null,planId:input.planId?String(input.planId):null,authorId:input.authorId?String(input.authorId):null,coins:Number.isFinite(Number(input.coins))?Number(input.coins):null,baseCoins:Number.isFinite(Number(input.baseCoins))?Number(input.baseCoins):null,state:'processing',recoveryState:'processing',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),attempts:0,recoveryAttempts:0,terminal:false};}
function ensureRecovery(existing,input){if(existing)return existing;return createRecovery(input);}
function markRecoveryAttempt(row){if(!row)throw new Error('recovery_not_found');if(row.terminal)return row;row.attempts=Number(row.attempts||0)+1;row.recoveryAttempts=Number(row.recoveryAttempts||0)+1;row.updatedAt=new Date().toISOString();return row;}
function canRecover(row){return !!row&&!row.terminal&&(['debit_confirmed','reconciliation_required'].includes(row.state))&&row.recoveryState!=='recovery_succeeded';}
function markRecovery(row,state){if(!row)throw new Error('recovery_not_found');const terminal=new Set(['recovery_succeeded','recovery_failed','reconciled_not_debited','refund_succeeded']);if(terminal.has(state)&&row.terminal)return row;row.recoveryState=String(state);row.terminal=terminal.has(state);row.updatedAt=new Date().toISOString();return row;}
function classifyFulfillmentSettlement(result={}){const d=classifyProviderResult(result);return {paymentState:d.state,canFulfill:d.state==='settled',mustReverseFulfillment:['refunded','debit_confirmed'].includes(d.state),needsReconciliation:['reconciliation_required','debit_confirmed'].includes(d.state),debited:d.debited,refunded:d.refunded};}
module.exports={AUTHORITATIVE,classifyProviderResult,resolveSettlementDestination,recoveryKey,createRecovery,ensureRecovery,markRecoveryAttempt,canRecover,markRecovery,classifyFulfillmentSettlement};
