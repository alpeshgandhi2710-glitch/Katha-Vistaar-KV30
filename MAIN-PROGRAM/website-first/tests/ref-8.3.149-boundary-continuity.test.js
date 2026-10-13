'use strict';
const assert=require('node:assert/strict');
const {makeOtpGateway}=require('../services/otp-gateway');
const {makeInternalTransactionalMail}=require('../services/internal-transactional-mail');
const {createPaymentRoutingManager}=require('../services/payment-routing-manager');
const {resolveSettlementDestination}=require('../services/payment-settlement-manager');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
function test(name,fn){try{Promise.resolve(fn()).then(()=>console.log('PASS',name)).catch(e=>{console.error('FAIL',name,e);process.exitCode=1})}catch(e){console.error('FAIL',name,e);process.exitCode=1}}
const services={capability:()=>({enabled:true}),safeCallAsync:async(id,ext,int,ctx)=>({ok:false,value:await int(),mode:'internal_fallback'})};
test('external OTP cannot be requested through legacy direct deliver path',async()=>{const g=makeOtpGateway({root,services,env:{}});await assert.rejects(()=>g.deliver({type:'email',target:'a@b.test',purpose:'x',otp:'1',row:{},externalEnabled:true}),e=>e.code==='external_otp_must_use_service_manager');});
test('transactional email is internal-first and only crosses the service-manager external boundary when internal delivery is unavailable',async()=>{
 let external=0,internal=0;
 const svc={capability:()=>({enabled:true}),safeCallAsync:async(id,ext,int)=>{external++;return {ok:true,value:await ext()}}};
 const m=makeInternalTransactionalMail({services:svc,sendExternal:async()=>({mode:'external',delivered:true}),sendInternal:async()=>{internal++;return {mode:'internal',delivered:true}}});
 let r=await m.deliver({to:'u@example.test',category:'receipt'});assert.equal(external,0);assert.equal(internal,1);assert.equal(r.mode,'internal');
 const m2=makeInternalTransactionalMail({services:svc,sendExternal:async()=>{external++;return {mode:'external',delivered:true}},sendInternal:async()=>({mode:'internal_queue',delivered:false,queued:true})});
 r=await m2.deliver({to:'u@example.test',category:'receipt'});assert.equal(external,2);assert.equal(r.mode,'external');
});
test('paymentRouting.configured supports zero-arg current-state contract',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kv149-'));const m=createPaymentRoutingManager(dir,{readUser:id=>({id,name:'U'}),actorCheck:()=>true});assert.equal(m.configured(),false);});
test('local internal-test settlement has a deterministic internal destination',()=>{assert.equal(resolveSettlementDestination({environment:'test'}),'internal_test_ledger');assert.equal(resolveSettlementDestination({environment:'production'}),null)});
test('protected payment/OTP source continuity remains explicit',()=>{assert.equal(typeof makeOtpGateway,'function');assert.equal(typeof createPaymentRoutingManager,'function');});
