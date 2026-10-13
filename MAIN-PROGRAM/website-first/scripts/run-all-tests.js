#!/usr/bin/env node
'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const runTempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-test-run-'));
process.env.TMPDIR=runTempRoot;process.env.TMP=runTempRoot;process.env.TEMP=runTempRoot;
const dirs=['tests','test'];
const files=dirs.flatMap(d=>{const dir=path.join(root,d);return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.test.js')).sort().map(f=>path.join(dir,f)):[]}).sort();
const concurrency=Math.max(1,Number(process.env.KV_TEST_CONCURRENCY||4));
const timeoutMs=Math.max(1000,Number(process.env.KV_TEST_FILE_TIMEOUT_MS||120000));
function resetTestRuntime(){
  if(String(process.env.KV_TEST_RESET_RUNTIME||'true').toLowerCase()==='false')return;
  const runtimePaths=[
    'data/development','data/production','data/tts','data/rendered','data/hls','data/exports','data/quarantine','data/ad-media',
    'data/payment-routing-state-v30.json','data/external-service-state-v30.json','data/managed-monetization.json',
    'data/master-admin-setup.json','data/ai-learning.json','data/ai-evaluation.json','data/ai-provider-policy.json','data/ai-internal-memory.json'
  ];
  for(const rel of runtimePaths){try{fs.rmSync(path.join(root,rel),{recursive:true,force:true})}catch(e){console.warn(`test-runtime-reset-warning:${rel}:${e.code||e.message}`)}}
}
resetTestRuntime();
process.env.KV_TEST_APPROVED_ROYALTY_GST_CONFIG=JSON.stringify({version:'test-fixture',kind:'royalty_payout',status:'approved',defaultRate:0,stateOverrides:{},stateCodeAliases:{MH:'MAHARASHTRA',GJ:'GUJARAT'},zeroRateAllowed:true});
process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG=JSON.stringify({schemaVersion:'v30-test',status:'APPROVED',legalBasis:{notificationNo:'TEST-LEGAL',notificationDate:'2026-01-01',sacHeading:'9984',sacGroup:'99843',exactClassification:'TEST-CLASSIFICATION'},productionMatrix:{isApproved:true,approvedBy:'test-runner',approvedAt:'2026-01-01T00:00:00.000Z',entries:[{state:'*',transactionCategory:'subscription_purchase',effectiveFrom:'2020-01-01T00:00:00.000Z',rate:0,taxInclusive:false,ruleVersion:'test-1'},{state:'*',transactionCategory:'coin_purchase',effectiveFrom:'2020-01-01T00:00:00.000Z',rate:0,taxInclusive:false,ruleVersion:'test-1'},{state:'*',transactionCategory:'sticker_purchase',effectiveFrom:'2020-01-01T00:00:00.000Z',rate:0,taxInclusive:false,ruleVersion:'test-1'}]},failClosedPolicy:{onMissingOrUnapproved:'BLOCK_MONETIZATION',allowFallbackInvent:false}});
const args=['--test','--test-force-exit',`--test-concurrency=${concurrency}`,`--test-timeout=${timeoutMs}`,...files];
const runTimeoutMs=Math.max(30000,Number(process.env.KV_TEST_RUN_TIMEOUT_MS||150000));
const resultPromise=new Promise((resolve)=>{
  const child=spawn(process.execPath,args,{cwd:root,env:process.env,stdio:'inherit',detached:process.platform!=='win32'});
  let timedOut=false,killTimer;
  const killGroup=(signal)=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,signal);else child.kill(signal)}catch(_){}};
  const timer=setTimeout(()=>{timedOut=true;console.error(`KV30 test suite exceeded ${runTimeoutMs}ms; terminating isolated test process group`);killGroup('SIGTERM');killTimer=setTimeout(()=>killGroup('SIGKILL'),2500);},runTimeoutMs);
  child.on('error',error=>{clearTimeout(timer);if(killTimer)clearTimeout(killTimer);resolve({status:1,error,signal:null,timedOut});});
  child.on('close',(status,signal)=>{clearTimeout(timer);if(killTimer)clearTimeout(killTimer);resolve({status,signal,error:null,timedOut});});
});

function cleanupGeneratedRuntime(){
  const runtimePaths=[
    'data/development','data/production','data/tts','data/rendered','data/hls','data/exports','data/quarantine','data/ad-media',
    'data/payment-routing-state-v30.json','data/external-service-state-v30.json','data/managed-monetization.json',
    'data/master-admin-setup.json','data/ai-learning.json','data/ai-evaluation.json','data/ai-provider-policy.json','data/ai-internal-memory.json'
  ];
  for(const rel of runtimePaths){try{fs.rmSync(path.join(root,rel),{recursive:true,force:true})}catch(e){console.warn(`test-runtime-cleanup-warning:${rel}:${e.code||e.message}`)}}
}
async function finish(){
  const result=await resultPromise;
  try{fs.rmSync(runTempRoot,{recursive:true,force:true})}catch(e){console.warn(`test-runtime-cleanup-warning:tmp:${e.code||e.message}`)}
  cleanupGeneratedRuntime();
  if(result.error){console.error(`KV30 native test runner error: ${result.error.message}`);process.exitCode=1;return}
  if(result.timedOut){console.error('KV30 native test runner failed: suite timeout');process.exitCode=1;return}
  if(result.signal){console.error(`KV30 native test runner terminated by ${result.signal}`);process.exitCode=1;return}
  if(result.status!==0){process.exitCode=result.status||1;return}
  console.log(`KV30 native Node test runner: ${files.length} test files PASS; concurrency=${concurrency}; per-test-timeout-ms=${timeoutMs}`);
}
finish().catch(e=>{console.error(e.stack||e);process.exitCode=1});
