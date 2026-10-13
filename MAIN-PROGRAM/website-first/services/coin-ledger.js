'use strict';
const crypto=require('node:crypto');
function createCoinLedger({transactions,id,now}={}){
 const makeId=()=>typeof id==='function'?id():'COIN-'+crypto.randomBytes(6).toString('hex').toUpperCase();
 const timestamp=()=>typeof now==='function'?now():new Date().toISOString();
 const list=k=>transactions.get(String(k))||[];
 const append=(k,row)=>{transactions.set(String(k),[...list(k),row]);return row};
 function debit(user,amount,meta={}){const n=Math.floor(Number(amount));if(!user||!Number.isFinite(n)||n<=0)throw Object.assign(new Error('invalid_coin_debit'),{code:'invalid_coin_debit'});const before=Number(user.coins||0);if(before<n)throw Object.assign(new Error('insufficient_coins'),{code:'insufficient_coins'});user.coins=before-n;return append(`coin-debit-${user.id}`,{id:`DEBIT-${makeId()}`,type:meta.type||'coin_debit',from:user.id,amount:-n,balanceBefore:before,balanceAfter:user.coins,createdAt:timestamp(),...meta});}
 function credit(user,amount,meta={}){const n=Math.floor(Number(amount));if(!user||!Number.isFinite(n)||n<=0)throw Object.assign(new Error('invalid_coin_credit'),{code:'invalid_coin_credit'});const before=Number(user.coins||0);user.coins=before+n;return append(`coin-credit-${user.id}`,{id:`CREDIT-${makeId()}`,type:meta.type||'coin_credit',to:user.id,amount:n,balanceBefore:before,balanceAfter:user.coins,createdAt:timestamp(),...meta});}
 function transfer(from,to,amount,meta={}){const n=Math.floor(Number(amount));if(!from||!to||from.id===to.id)throw Object.assign(new Error('invalid_coin_transfer'),{code:'invalid_coin_transfer'});if(!Number.isFinite(n)||n<=0)throw Object.assign(new Error('invalid_coin_transfer'),{code:'invalid_coin_transfer'});const beforeFrom=Number(from.coins||0),beforeTo=Number(to.coins||0);if(beforeFrom<n)throw Object.assign(new Error('insufficient_coins'),{code:'insufficient_coins'});from.coins=beforeFrom-n;to.coins=beforeTo+n;const txId=makeId();append(`coin-debit-${from.id}`,{id:`DEBIT-${txId}`,type:meta.type||'coin_transfer_debit',from:from.id,to:to.id,amount:-n,balanceBefore:beforeFrom,balanceAfter:from.coins,createdAt:timestamp(),...meta});append(`coin-credit-${to.id}`,{id:`CREDIT-${txId}`,type:meta.type||'coin_transfer_credit',from:from.id,to:to.id,amount:n,balanceBefore:beforeTo,balanceAfter:to.coins,createdAt:timestamp(),...meta});return {id:txId,amount:n,from:from.id,to:to.id};}
 function record(user,amount,meta={}){const n=Number(amount);if(!user||!Number.isFinite(n))throw Object.assign(new Error('invalid_coin_record'),{code:'invalid_coin_record'});return append(`coin-record-${user.id}`,{id:makeId(),type:meta.type||'coin_record',userId:user.id,amount:n,createdAt:timestamp(),...meta});}
 return {debit,credit,transfer,record,append};
}
module.exports={createCoinLedger};
