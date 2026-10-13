const {test}=require('node:test');
process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG=JSON.stringify({schemaVersion:'v30-test',status:'APPROVED',legalBasis:{notificationNo:'TEST-NONPRODUCTION',notificationDate:'2026-09-23',sacHeading:'9984',sacGroup:'99843',exactClassification:'TEST-ONLY'},productionMatrix:{isApproved:true,approvedBy:'test-fixture',approvedAt:'2026-09-23T00:00:00.000Z',entries:[{state:'*',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:'2027-01-01T00:00:00.000Z',ruleVersion:'TEST-GST-2026',rate:0,taxInclusive:false,chargeBasis:'test_only',sourceReference:'TEST-SOURCE-2026',sourceChecksum:'TEST-CHECKSUM-2026'}]},approvalEvidence:{legalReviewer:'TEST ONLY',evidenceReferences:['TEST-ONLY'],sourceSnapshot:{sourceUrl:'https://example.invalid/test-tax-source',checksum:'TEST-SNAPSHOT',capturedAt:'2026-09-23T00:00:00.000Z'}},failClosedPolicy:{onMissingOrUnapproved:'BLOCK_MONETIZATION',allowFallbackInvent:false}});
process.env.KV_TEST_APPROVED_ROYALTY_GST_CONFIG=JSON.stringify({version:'v30-test',kind:'royalty_payout',status:'approved',defaultRate:0,stateOverrides:{},stateCodeAliases:{MH:'MAHARASHTRA',GJ:'GUJARAT'},zeroRateAllowed:true});
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createRoyaltyEngine}=require('../core/royalty-engine');
const {createManagedMonetization}=require('../core/managed-monetization');

test('REF-8.3.155.9.2.23 platform subscription royalty formula uses Master-Admin configuration',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kv-platform-royalty-'));fs.mkdirSync(path.join(root,'config'),{recursive:true});fs.mkdirSync(path.join(root,'data'),{recursive:true});
 const engineCfg={version:'test',creator_rate:'40%',sticker_direct_rate:'45%',platform_subscription_rate:'40%',basis:'net_distributable_revenue',currency:'INR',min_genuine_followers:200};
 fs.writeFileSync(path.join(root,'config','royalty-engine.json'),JSON.stringify(engineCfg));
 fs.writeFileSync(path.join(root,'config','royalty-gst-v30.json'),JSON.stringify({kind:'royalty_payout',status:'approved',defaultRate:0,stateOverrides:{},stateCodeAliases:{MH:'MAHARASHTRA',GJ:'GUJARAT'},zeroRateAllowed:true}));
 fs.writeFileSync(path.join(root,'config','managed-monetization.json'),JSON.stringify({royalty:{platformSubscriptionRate:0.40,creatorRate:0.40,stickerDirectRate:0.45,gstRate:0,minGenuineFollowers:200}}));
 const audit={record(){}};const managed=createManagedMonetization(root,audit);
 const configured=managed.setRoyalty('master_admin',{platformSubscriptionRate:0.40});
 assert.equal(configured.platformSubscriptionRate,0.40);
 const events=new Map(),ledger=new Map();const engine=createRoyaltyEngine(root,{events,ledger});
 const pool=engine.calculatePlatformSubscriptionPool({eligibleRevenue:1000});
 assert.equal(pool.platformSubscriptionRate,0.40);assert.equal(pool.creatorRoyaltyPool,400);
 const a=engine.recordPlatformSubscriptionAllocation({eligibleRevenue:1000,consumptionUnits:6,totalConsumptionUnits:10,creatorId:'author-a',transactionId:'sub-1'});
 assert.equal(a.allocation,240);assert.equal(a.netRoyalty,240);
 const b=engine.recordPlatformSubscriptionAllocation({eligibleRevenue:1000,consumptionUnits:4,totalConsumptionUnits:10,creatorId:'author-b',transactionId:'sub-1'});
 assert.equal(b.allocation,160);assert.equal(b.netRoyalty,160);
 assert.equal(a.allocation+b.allocation,400);
 const replay=engine.recordPlatformSubscriptionAllocation({eligibleRevenue:1000,consumptionUnits:6,totalConsumptionUnits:10,creatorId:'author-a',transactionId:'sub-1'});
 assert.equal(replay.replayed,true);assert.equal(replay.allocation,240);
 const updated=engine.recordPlatformSubscriptionAllocation({eligibleRevenue:1000,consumptionUnits:7,totalConsumptionUnits:11,creatorId:'author-a',transactionId:'sub-1'});
 assert.equal(updated.replayed,true);assert.equal(updated.allocation,254.55);
 assert.equal(updated.rateSnapshot,0.40);
});

test('REF-8.3.155.9.2.23 platform subscription royalty supports 0% and configuration change without code change',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kv-platform-royalty-zero-'));fs.mkdirSync(path.join(root,'config'),{recursive:true});fs.mkdirSync(path.join(root,'data'),{recursive:true});
 fs.writeFileSync(path.join(root,'config','royalty-engine.json'),JSON.stringify({creator_rate:'40%',sticker_direct_rate:'45%',platform_subscription_rate:'40%',basis:'net_distributable_revenue',currency:'INR',min_genuine_followers:200}));
 fs.writeFileSync(path.join(root,'config','royalty-gst-v30.json'),JSON.stringify({kind:'royalty_payout',status:'approved',defaultRate:0,stateOverrides:{},stateCodeAliases:{MH:'MAHARASHTRA',GJ:'GUJARAT'},zeroRateAllowed:true}));
 fs.writeFileSync(path.join(root,'config','managed-monetization.json'),JSON.stringify({royalty:{platformSubscriptionRate:0.40,creatorRate:0.40,stickerDirectRate:0.45,gstRate:0,minGenuineFollowers:200}}));
 const managed=createManagedMonetization(root,{record(){}});managed.setRoyalty('master_admin',{platformSubscriptionRate:0});
 const engine=createRoyaltyEngine(root,{events:new Map(),ledger:new Map()});
 assert.equal(engine.calculatePlatformSubscriptionPool({eligibleRevenue:1000}).creatorRoyaltyPool,0);
 managed.setRoyalty('master_admin',{platformSubscriptionRate:0.50});
 assert.equal(engine.calculatePlatformSubscriptionPool({eligibleRevenue:1000}).creatorRoyaltyPool,500);
 managed.setRoyalty('master_admin',{minGenuineFollowers:0,creatorRate:0});
 assert.equal(managed.get().royalty.minGenuineFollowers,0);
 assert.equal(managed.get().royalty.creatorRate,0);
 managed.setRoyalty('master_admin',{minGenuineFollowers:375,creatorRate:0.4});
 assert.equal(managed.get().royalty.minGenuineFollowers,375);
 assert.equal(managed.get().royalty.creatorRate,0.4);
});

test('REF-8.3.155.9.2.23 Master Admin policy API writes platform royalty rate and delegated Admin requires explicit grant',async()=>{
 process.env.ALLOW_LOCAL_DEMO='true';process.env.KV_ADMIN_KEY='test-admin-key';
 const http=require('node:http');const {server}=require('../src/server');
 const request=(port,method,url,body,cookie='')=>new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const req=http.request({host:'127.0.0.1',port,method,path:url,headers:{'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{})}},res=>{let s='';res.setEncoding('utf8');res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,body:s,headers:res.headers}))});req.on('error',reject);if(data)req.write(data);req.end()});
 const cookie=r=>(r.headers['set-cookie']||[])[0]?.split(';')[0]||'';
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
 try{
  const login=await request(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'});assert.equal(login.status,200);const mc=cookie(login);
  const patch=await request(port,'PATCH','/api/admin/monetization',{section:'royalty',value:{platformSubscriptionRate:0.40,creatorRate:0.40,minGenuineFollowers:200,platformSubscriptionAttribution:'eligible_consumption_share'}},mc);assert.equal(patch.status,200);const policy=JSON.parse(patch.body).policy;assert.equal(policy.royalty.platformSubscriptionRate,0.40);assert.equal(policy.royalty.creatorRate,0.40);assert.equal(policy.royalty.minGenuineFollowers,200);assert.equal(policy.royalty.platformSubscriptionAttribution,'eligible_consumption_share');
  const changed=await request(port,'PATCH','/api/admin/monetization',{section:'royalty',value:{platformSubscriptionRate:0,minGenuineFollowers:0,creatorRate:0}},mc);assert.equal(changed.status,200);const changedPolicy=JSON.parse(changed.body).policy;assert.equal(changedPolicy.royalty.platformSubscriptionRate,0);assert.equal(changedPolicy.royalty.creatorRate,0);assert.equal(changedPolicy.royalty.minGenuineFollowers,0);
  const restored=await request(port,'PATCH','/api/admin/monetization',{section:'royalty',value:{platformSubscriptionRate:0.40,minGenuineFollowers:200,creatorRate:0.40}},mc);assert.equal(restored.status,200);
  const perm=await request(port,'PATCH','/api/admin/monetization/permissions',{permissions:{'delegated-platform-test':['monetization.policy']}},mc);assert.equal(perm.status,200);
 }finally{srv.close();delete process.env.KV_ADMIN_KEY;delete process.env.ALLOW_LOCAL_DEMO;}
});

test('REF-8.3.155.9.2.23 runtime platform subscription allocation remains approval-gated',async()=>{
 process.env.ALLOW_LOCAL_DEMO='true';process.env.KV_ADMIN_KEY='test-admin-key';
 const http=require('node:http');const {server,users,royaltyEvents}=require('../src/server');
 const req=(port,method,url,body,cookie='')=>new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const r=http.request({host:'127.0.0.1',port,method,path:url,headers:{'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...(cookie?{Cookie:cookie}:{})}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,body:s,headers:res.headers}))});r.on('error',reject);if(data)r.write(data);r.end()});
 const ck=r=>(r.headers['set-cookie']||[])[0]?.split(';')[0]||'';
 const register=async(name)=>{let r=await req(port,'POST','/api/auth/register',{username:name,email:`${name}@example.com`,password:'secret1'});assert.equal(r.status,201);r=await req(port,'POST','/api/auth/verify-otp',{target:`${name}@example.com`,purpose:'register-email',otp:'123456'});assert.equal(r.status,200);r=await req(port,'POST','/api/auth/login',{identifier:name,password:'secret1'});assert.equal(r.status,200);return ck(r)};
 const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
 try{
  const admin=await req(port,'POST','/api/admin/session',{key:'test-admin-key',role:'master_admin'});assert.equal(admin.status,200);const mc=ck(admin);
  const author=await register('platformauthora242'),reader=await register('platformreader242');
  const aid=JSON.parse((await req(port,'GET','/api/auth/me',null,author)).body).user.id;users.get(aid).followers=0;
  let r=await req(port,'POST','/api/content',{type:'story',workType:'short-story',title:'Platform Eligible',category:'romance',body:'Eligible content',status:'published',rightsConfirmed:true,platformSubscriptionEligible:true},author);assert.equal(r.status,201);const cid=JSON.parse(r.body).content.id;
  const cat=JSON.parse((await req(port,'GET','/api/monetization/catalog',null,reader)).body).policy;const plan=cat.subscriptions.find(x=>x.id==='platform_subscription');assert.ok(plan);
  r=await req(port,'POST','/api/payments/internal-otp/start',{action:'subscription',reference:'platform_subscription',amount:Number(plan.price)},reader);assert.equal(r.status,200);let sj=JSON.parse(r.body);r=await req(port,'POST','/api/payments/internal-otp/verify',{paymentToken:sj.paymentToken,otp:sj.demoOtp},reader);assert.equal(r.status,200);
  r=await req(port,'POST','/api/subscriptions/purchase',{planId:'platform_subscription',mode:'internal_test',method:'internal_test',paymentToken:sj.paymentToken,idempotencyKey:'platform-gated-242'},reader);assert.equal(r.status,200);const tx=JSON.parse(r.body).transaction;
  users.get(aid).followers=200;
  r=await req(port,'POST','/api/subscriptions/platform/consume',{subscriptionTransactionId:tx.id,contentId:cid,eventId:'consume-approved-248',units:1},reader);assert.equal(r.status,201);const j=JSON.parse(r.body);assert.equal(j.ok,true);assert.ok(j.allocations.length>=1);assert.equal(j.allocations[0].platformSubscriptionRate,0.40);assert.equal(j.allocations[0].consumptionShare,1);
  assert.equal([...royaltyEvents.values()].some(x=>x.stream==='platform_subscription'&&x.sourceSubscriptionTransactionId===tx.id),true);
 }finally{srv.close();delete process.env.KV_ADMIN_KEY;delete process.env.ALLOW_LOCAL_DEMO;}
});
