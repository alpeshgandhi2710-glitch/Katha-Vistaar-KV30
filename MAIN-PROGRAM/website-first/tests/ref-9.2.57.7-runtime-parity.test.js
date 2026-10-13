const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SERVER=path.join(ROOT,'src','server.js');
const PARITY=JSON.parse(fs.readFileSync(path.join(ROOT,'..','shared','runtime-parity-v30.json'),'utf8'));
function start(port,env){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[SERVER],{cwd:ROOT,env:{...process.env,PORT:String(port),KV_ENV:env.KV_ENV,ALLOW_TEST_HOOKS:env.ALLOW_TEST_HOOKS||'false',ALLOW_LOCAL_DEMO:env.ALLOW_LOCAL_DEMO||'false',NODE_ENV:env.KV_ENV==='production'?'production':'development',KV_PASSWORD_SALT:'test-salt'},stdio:['ignore','pipe','pipe']});let out='';const timer=setTimeout(()=>resolve(p),3000);p.stdout.on('data',d=>{out+=d.toString();if(out.includes(`listening on ${port}`)){clearTimeout(timer);resolve(p);}});p.stderr.on('data',d=>out+=d.toString());p.on('error',reject);p.on('exit',code=>{if(code&&code!==0)reject(new Error(`server_exit_${code}: ${out}`));});});}
async function stop(p){if(!p||p.killed)return;p.kill('SIGTERM');await new Promise(r=>setTimeout(r,100));}
async function get(port,path){return fetch(`http://127.0.0.1:${port}${path}`);}
async function post(port,path,body){return fetch(`http://127.0.0.1:${port}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}

test('runtime parity contract covers Dev/Internal, Dev/External, Prod/Internal, Prod/External',()=>{
 assert.equal(PARITY.runtimes.length,4);
 assert.deepEqual(PARITY.runtimes.map(x=>x.port),[8787,8788,9797,9798]);
 assert.deepEqual(PARITY.sharedRequiredRoutes,['/api/health','/api/master-admin/login','/api/register','/api/login']);
 assert.equal(PARITY.productionRule.includes('/api/test/*'),true);
 assert.deepEqual(PARITY.aiAliases.report_ai,['analytics_ai']);
 assert.ok(PARITY.aiAliases.account_ai.includes('account_management_ai'));
 assert.deepEqual(PARITY.purchaseFlow,['purchase_request','purchase_order','purchase_invoice','procurement_payment','reconciliation']);
 assert.deepEqual(Object.keys(PARITY.studioFormats),['story','comic','audio','reel']);
 assert.ok(PARITY.studioFormats.story.autosave && PARITY.studioFormats.story.revision);
 assert.ok(PARITY.studioFormats.comic.panels && PARITY.studioFormats.comic.revision);
 assert.ok(PARITY.studioFormats.audio.episodes && PARITY.studioFormats.audio.mix && PARITY.studioFormats.audio.tts);
 assert.ok(PARITY.studioFormats.reel.timeline && PARITY.studioFormats.reel.render);
 assert.equal(PARITY.studioSharedRules.length,4);
});

test('development exposes governed compatibility routes and test hooks only when enabled',async()=>{
 const p=await start(8791,{KV_ENV:'development',ALLOW_TEST_HOOKS:'true',ALLOW_LOCAL_DEMO:'true'});
 try{
  assert.equal((await get(8791,'/api/health')).status,200);
  assert.equal((await post(8791,'/api/master-admin/login',{masterKey:'katha-vistaar-local-master',productKey:'katha-vistaar-local-product'})).status,200);
  assert.equal((await post(8791,'/api/test/clear-data',{})).status,200);
  const r=await post(8791,'/api/register',{username:'parity_user_9577',userId:'PARITY9577',password:'Demo123!',email:'parity@example.test',verificationMethod:'email'});
  assert.equal(r.status,201);
  const l=await post(8791,'/api/login',{identifier:'parity_user_9577',password:'Demo123!'});
  assert.equal(l.status,403); // account exists but contact verification is required
  const h=await post(8791,'/api/test/clear-data',{});
  assert.equal(h.status,200);
 } finally {await stop(p);}
});

test('production does not expose development test hooks',async()=>{
 const p=await start(9791,{KV_ENV:'production',ALLOW_TEST_HOOKS:'false',ALLOW_LOCAL_DEMO:'false'});
 try{
  assert.equal((await get(9791,'/api/health')).status,200);
  assert.equal((await post(9791,'/api/test/expire-otp',{target:'x',purpose:'x'})).status,404);
  assert.equal((await post(9791,'/api/test/clear-data',{})).status,404);
 } finally {await stop(p);}
});
