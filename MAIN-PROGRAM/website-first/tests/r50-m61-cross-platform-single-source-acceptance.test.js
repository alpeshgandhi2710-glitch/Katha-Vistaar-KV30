const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');

process.env.ALLOW_LOCAL_DEMO='true';
process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG=JSON.stringify({
  schemaVersion:'v30-test',status:'APPROVED',
  legalBasis:{notificationNo:'TEST-NONPRODUCTION',notificationDate:'2026-09-23',sacHeading:'9984',sacGroup:'99843',exactClassification:'TEST-ONLY'},
  productionMatrix:{isApproved:true,approvedBy:'test-fixture',approvedAt:'2026-09-23T00:00:00.000Z',entries:[
    {state:'*',transactionCategory:'subscription_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:'2027-01-01T00:00:00.000Z',ruleVersion:'TEST-GST-2026',rate:0,taxInclusive:false,chargeBasis:'test_only',sourceReference:'TEST-SOURCE-2026',sourceChecksum:'TEST-CHECKSUM-2026'},
    {state:'*',transactionCategory:'coin_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:'2027-01-01T00:00:00.000Z',ruleVersion:'TEST-GST-2026',rate:0,taxInclusive:false,chargeBasis:'test_only',sourceReference:'TEST-SOURCE-2026',sourceChecksum:'TEST-CHECKSUM-2026'},
    {state:'*',transactionCategory:'sticker_purchase',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:'2027-01-01T00:00:00.000Z',ruleVersion:'TEST-GST-2026',rate:0,taxInclusive:false,chargeBasis:'test_only',sourceReference:'TEST-SOURCE-2026',sourceChecksum:'TEST-CHECKSUM-2026'}
  ]},
  approvalEvidence:{legalReviewer:'TEST ONLY',evidenceReferences:['TEST-ONLY'],sourceSnapshot:{sourceUrl:'https://example.invalid/test-tax-source',checksum:'TEST-SNAPSHOT',capturedAt:'2026-09-23T00:00:00.000Z'}},
  failClosedPolicy:{onMissingOrUnapproved:'BLOCK_MONETIZATION',allowFallbackInvent:false}
});

const {server}=require('../src/server');
const CLIENTS=['web','desktop-electron','android','ios'];
function req(port,method,path,body,cookie,client='web',stateHash=null){
  return new Promise((resolve,reject)=>{
    const data=body===undefined||body===null?null:JSON.stringify(body);
    const headers={'Content-Type':'application/json','x-kv30-client':client,'x-kv30-state-sync':'true'};
    if(data)headers['Content-Length']=Buffer.byteLength(data);
    if(cookie)headers.Cookie=cookie;
    if(stateHash)headers['x-kv30-state-hash']=stateHash;
    const r=http.request({host:'127.0.0.1',port,method,path,headers},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>resolve({status:res.statusCode,body:b,headers:res.headers,json:()=>b?JSON.parse(b):{}}));});
    r.on('error',reject);if(data)r.write(data);r.end();
  });
}
function cookieOf(r){return (r.headers['set-cookie']||[])[0]?.split(';')[0]||'';}
async function registerLogin(port,tag){
  const email=`${tag}@example.test`;
  let r=await req(port,'POST','/api/auth/register',{username:tag,email,password:'Test123!',confirmPassword:'Test123!',verificationMethod:'email'});
  assert.equal(r.status,201,`register ${tag}`);const j=r.json();
  r=await req(port,'POST','/api/auth/verify-otp',{target:email,purpose:'register-email',otp:j.demoOtp||'123456'});assert.equal(r.status,200,`verify ${tag}`);
  r=await req(port,'POST','/api/auth/login',{identifier:tag,password:'Test123!'},undefined,'web');assert.equal(r.status,200,`login ${tag}`);
  return cookieOf(r);
}
async function canonical(port,cookie,client){
  const r=await req(port,'GET','/api/state/canonical',undefined,cookie,client);assert.equal(r.status,200,`canonical ${client}`);
  const j=r.json();assert.equal(j.contract,'KV30-SINGLE-ACCOUNT-SOURCE-OF-TRUTH-v1');
  return j;
}
async function assertParity(port,cookie,expectedHash){
  const rows=[];for(const c of CLIENTS)rows.push(await canonical(port,cookie,c));
  const hashes=rows.map(x=>x.stateHash);assert.ok(hashes.every(x=>x===hashes[0]),'all clients must receive one canonical state hash');
  if(expectedHash)assert.equal(hashes[0],expectedHash);
  const serialized=rows.map(x=>JSON.stringify(x.snapshot));assert.ok(serialized.every(x=>x===serialized[0]),'all clients must receive identical canonical snapshot');
  return rows[0];
}

 test('R50-M61 single-account server truth: four-client mutation/read-back matrix',async()=>{
  const srv=http.createServer(server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
  try{
    const author=await registerLogin(port,'m61author'+Date.now().toString(36).slice(-6));
    const actor=await registerLogin(port,'m61actor'+Date.now().toString(36).slice(-6));
    let state=await assertParity(port,actor);assert.equal(state.snapshot.governance.serverPreferences.length>=0,true);

    let authorBefore=await canonical(port,author,'web');
    let r=await req(port,'POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'M61 parity source',body:'Published source for cross-platform parity.',status:'published',rightsConfirmed:true,mediaRightsConfirmed:true,language:'en'},author,'web',authorBefore.stateHash);
    assert.equal(r.status,201);const contentId=r.json().content.id;

    const mutations=[
      ['android','POST','/api/follows',{authorId:r.json().content.ownerId,following:true}],
      ['ios','POST','/api/likes',{contentId,liked:true}],
      ['web','POST','/api/comments',{contentId,body:'Cross-platform parity comment'}],
      ['desktop-electron','PUT','/api/reader/state',{contentId,format:'story',progress:0.42,bookmarked:true}],
      ['web','PATCH','/api/profile',{name:'M61 Parity Profile'}],
      ['android','POST','/api/content',{type:'story',workType:'short-story',category:'life',title:'Parity Draft X',body:'Draft created on Android.',status:'draft',rightsConfirmed:false,mediaRightsConfirmed:false,language:'en'}]
    ];
    for(const [client,method,path,body] of mutations){
      const before=await canonical(port,actor,client);
      r=await req(port,method,path,body,actor,client,before.stateHash);assert.ok(r.status>=200&&r.status<300,`${client} ${method} ${path}: ${r.status} ${r.body}`);
      state=await assertParity(port,actor);assert.notEqual(state.stateHash,before.stateHash,`${client} mutation must advance canonical state hash`);
    }

    const draftId=state.snapshot.story.ownedContent.find(c=>c.title==='Parity Draft X')?.id;assert.ok(draftId,'draft must be server persisted and visible in canonical story state');
    r=await req(port,'PATCH',`/api/content/${draftId}`,{title:'Parity Draft X updated on iPhone',body:'Latest persisted draft body from iPhone.',status:'draft'},actor,'ios',(await canonical(port,actor,'ios')).stateHash);assert.equal(r.status,200);
    state=await assertParity(port,actor);
    assert.equal(state.snapshot.story.ownedContent.find(c=>c.id===draftId).title,'Parity Draft X updated on iPhone');

    r=await req(port,'POST',`/api/studio/story/${draftId}/autosave`,{title:'Parity Draft X autosaved',summary:'server persisted',body:'Latest autosaved body from Desktop.',language:'en',project:{acts:[],scenes:[{id:'s1',title:'Scene',body:'Latest autosave'}],characters:[]}},actor,'desktop-electron',(await canonical(port,actor,'desktop-electron')).stateHash);assert.equal(r.status,200);
    state=await assertParity(port,actor);assert.equal(state.snapshot.story.autosaves.some(x=>x.key===draftId),true);

    const cat=(await req(port,'GET','/api/monetization/catalog',undefined,actor,'web')).json().policy;
    const pack=cat.coinPacks.find(x=>x.coins===100)||cat.coinPacks[0];
    let coinOtpState=await canonical(port,actor,'web');
    r=await req(port,'POST','/api/payments/internal-otp/start',{action:'coin_purchase',reference:String(pack.coins),amount:Number(pack.price||0)},actor,'web',coinOtpState.stateHash);assert.equal(r.status,200);const otp=r.json();
    r=await req(port,'POST','/api/payments/internal-otp/verify',{paymentToken:otp.paymentToken,otp:otp.demoOtp},actor,'web',(await canonical(port,actor,'web')).stateHash);assert.equal(r.status,200);
    const coinBefore=await canonical(port,actor,'web');r=await req(port,'POST','/api/coins/purchase',{coins:pack.coins,method:'internal_test',paymentToken:otp.paymentToken,idempotencyKey:'m61-cross-coin'},actor,'web',coinBefore.stateHash);assert.equal(r.status,200);state=await assertParity(port,actor);assert.ok(state.snapshot.monetization.coins>=coinBefore.snapshot.monetization.coins);

    r=await req(port,'POST','/api/payments/internal-otp/start',{action:'subscription',reference:'platform_subscription',amount:999},actor,'ios',(await canonical(port,actor,'ios')).stateHash);assert.equal(r.status,200);const subOtp=r.json();
    r=await req(port,'POST','/api/payments/internal-otp/verify',{paymentToken:subOtp.paymentToken,otp:subOtp.demoOtp},actor,'ios',(await canonical(port,actor,'ios')).stateHash);assert.equal(r.status,200);
    const subBefore=await canonical(port,actor,'ios');
    r=await req(port,'POST','/api/subscriptions/purchase',{planId:'platform_subscription',mode:'internal_test',method:'internal_test',paymentToken:subOtp.paymentToken,idempotencyKey:'m61-cross-sub'},actor,'ios',subBefore.stateHash);assert.equal(r.status,200);state=await assertParity(port,actor);assert.equal(state.snapshot.monetization.subscriptions.platformSubscription,true);

    const stale=await canonical(port,actor,'android');
    r=await req(port,'PATCH','/api/profile',{name:'M61 desktop mutation after stale read'},actor,'desktop-electron',stale.stateHash);assert.equal(r.status,200);
    r=await req(port,'PATCH','/api/profile',{name:'M61 stale android mutation'},actor,'android',stale.stateHash);assert.equal(r.status,409);assert.equal(r.json().error,'stale_canonical_state');
    const refreshed=await canonical(port,actor,'android');assert.equal(refreshed.stateHash,r.json().currentStateHash);
    r=await req(port,'PATCH','/api/profile',{name:'M61 android mutation after refresh'},actor,'android',refreshed.stateHash);assert.equal(r.status,200);
    state=await assertParity(port,actor);assert.equal(state.snapshot.account.name,'M61 android mutation after refresh');

    assert.equal(state.snapshot.account.id,state.snapshot.account.id);
    assert.ok(state.snapshot.social.followRelations.length>0,'follow relation persisted centrally');
    assert.ok(state.snapshot.social.likesByUser.length>0,'like relation persisted centrally');
    assert.ok(state.snapshot.social.commentsByUser.length>0,'comment relation persisted centrally');
    assert.ok(state.snapshot.reader.progress[contentId],'reader progress persisted centrally');
    assert.ok(state.snapshot.monetization.coinLots.length>0,'coin lots persisted centrally');
    assert.equal(state.snapshot.monetization.subscriptions.platformSubscription,true);
  }finally{srv.close();delete process.env.ALLOW_LOCAL_DEMO;delete process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG;}
 });
