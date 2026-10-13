'use strict';
const crypto=require('node:crypto');
const METHODS=['bank_account','atm_debit_card','credit_card','upi','wallet','mobile_banking','net_banking','qr'];
function validate({amount,method,idempotencyKey}){
 const n=Number(amount);
 if(!Number.isFinite(n)||n<=0||n>1000000)throw Object.assign(new Error('invalid_amount'),{code:'invalid_amount'});
 if(!METHODS.includes(String(method)))throw Object.assign(new Error('unsupported_payment_method'),{code:'unsupported_payment_method'});
 if(!String(idempotencyKey||'').trim())throw Object.assign(new Error('idempotency_key_required'),{code:'idempotency_key_required'});
 return {amount:n,method:String(method),idempotencyKey:String(idempotencyKey)};
}
function createLedger(){const byKey=new Map(),rows=[];return {create(input){const v=validate(input),existing=byKey.get(v.idempotencyKey);if(existing)return {...existing,replayed:true};const tx={id:'TX-'+crypto.randomBytes(7).toString('hex').toUpperCase(),amount:v.amount,method:v.method,status:'test_only',idempotencyKey:v.idempotencyKey,createdAt:new Date().toISOString()};byKey.set(v.idempotencyKey,tx);rows.push(tx);return {...tx,replayed:false};},list(){return rows.map(x=>({...x}));}}}
module.exports={METHODS,validate,createLedger};
