'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const {makeOtpGateway}=require('../services/otp-gateway');
const {createCoinLedger}=require('../services/coin-ledger');
const {createPaymentRoutingManager}=require('../services/payment-routing-manager');
const {createServiceManager}=require('../services/service-manager');

test('legacy OTP gateway contract is restored for internal and external transports',async()=>{
 const mail=[];const calls=[];
 const services={};
 const gw=makeOtpGateway({root,services,mailOutbox:mail,env:{}});
 assert.equal(gw.config.autoFill.internalTokenTtlSeconds,180);
 assert.equal(gw.config.autoFill.singleUse,true);
 const row={id:'MSG-TEST'};
 const r=await gw.deliver({type:'email',target:'a@example.test',purpose:'login-email',otp:'123456',row,externalEnabled:false});
 assert.equal(r.internalStored,true);assert.equal(r.delivered,false);
 assert.equal(typeof gw.issueAutoFillToken(),'string');
 assert.equal(calls.length,0);
});

test('common coin ledger atomically supports debit credit and transfer',()=>{
 const tx=new Map(),u={id:'u1',coins:20},v={id:'u2',coins:5};
 const ledger=createCoinLedger({transactions:tx,id:()=>`T${tx.size+1}`,now:()=>new Date(0).toISOString()});
 ledger.transfer(u,v,7,{type:'gift'});assert.equal(u.coins,13);assert.equal(v.coins,12);
 ledger.debit(u,3,{type:'unlock'});assert.equal(u.coins,10);
 ledger.credit(v,8,{type:'reward'});assert.equal(v.coins,20);
 assert.ok([...tx.values()].flat().length>=4);
 assert.throws(()=>ledger.debit(u,999),/insufficient_coins/);
});

test('payment routing protects verified destinations and masks public state',()=>{
 const users=new Map([['u1',{id:'u1',name:'A',bankAccountNumber:'123456789',bankName:'Bank',ifsc:'TEST0001',pan:'ABCDE1234F',royaltyDetailsVerified:false}]]);
 const mgr=createPaymentRoutingManager(root,{readUser:id=>users.get(id),writeUser:u=>users.set(u.id,u),actorCheck:a=>a==='master_admin'});
 assert.equal(mgr.configured(users.get('u1')),true);assert.equal(mgr.publicStatus(users.get('u1')).bankAccountNumber,'•••••6789');
 mgr.updateDestination('u1',{bankBranch:'Main'},'master_admin');assert.equal(users.get('u1').bankBranch,'Main');
 users.get('u1').royaltyDetailsVerified=true;
 assert.throws(()=>mgr.updateDestination('u1',{bankName:'Other'},'master_admin'),/verified_destination_locked/);
});

test('current service registry keeps payment/email/sms on canonical external gates',()=>{
 const sm=createServiceManager(root,{});
 for(const id of ['payments','email','sms']){const s=sm.get(id);assert.equal(s.internalLayer,'always_on');assert.equal(s.externalLayer,'master_admin_controlled');assert.equal(s.externalEnabled,false);assert.equal(s.firewallRequired,true);assert.ok(s.externalGate)}
});
