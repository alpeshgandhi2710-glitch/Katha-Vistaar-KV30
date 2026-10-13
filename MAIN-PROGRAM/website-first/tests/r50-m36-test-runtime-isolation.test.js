const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');

test('M36 payment-routing test state is isolated from governed runtime data',()=>{
  const {createPaymentRoutingManager}=require('../services/payment-routing-manager.js');
  const users=new Map([['u1',{id:'u1',accountHolder:'Test',royaltyDetailsVerified:false}]]);
  const m=createPaymentRoutingManager(path.resolve(__dirname,'..'),{readUser:id=>users.get(id),writeUser:u=>users.set(u.id,u),actorCheck:actor=>actor==='admin'});
  const state=m.getState();
  assert.deepEqual(state,{version:'30.0.0',destinations:{}});
  m.updateDestination('u1',{bankName:'Test Bank',ifsc:'TEST0001',bankAccountNumber:'1234',pan:'ABCDE1234F'},'admin');
  const expected=path.join(os.tmpdir(),'katha-vistaar-tests',`payment-routing-state-${process.pid}.json`);
  assert.equal(fs.existsSync(expected),true);
  assert.notEqual(m.file,path.resolve(__dirname,'..','data','payment-routing-state-v30.json'));
  assert.equal(m.file,expected);
  try{fs.rmSync(expected,{force:true});}catch{}
});
