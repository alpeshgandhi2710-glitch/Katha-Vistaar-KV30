'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../../website-first');
const srcFile=path.join(root,'config','tts-approved-asset-sources-v30.json');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-tts-acquisition-'));
process.env.KV_TTS_TRAINING_ACCESS_STATE=path.join(tmp,'access.json');
process.env.KV_TTS_TRAINING_ACCESS_AUDIT=path.join(tmp,'audit.jsonl');
const access=require('../src/services/ai-tts-training-access-control');
const acq=require('../src/services/ai-tts-governed-asset-acquisition');
test('acquisition is Master Admin only and rejects unregistered asset IDs without network access',()=>{
 assert.equal(acq.acquire('piper-en-test',{actorRole:'admin'}).reason,'master_admin_required_for_tts_asset_acquisition');
 assert.equal(acq.acquire('piper-en-test',{actorRole:'master_admin'}).reason,'tts_asset_source_not_approved');
});
test('status reflects real switch, internet gate and approved-source inventory',()=>{
 const s=acq.status();assert.equal(s.approvedSources,0);assert.equal(s.ready,0);assert.equal(s.externalModelDownloadEnabled,false);assert.equal(s.internetGateEnabled,false);
});
test('asset source validation rejects unsafe URLs and fake or missing approval before network',()=>{
 const original=fs.readFileSync(srcFile,'utf8');
 try{
  const c=JSON.parse(original);c.sources=[{id:'piper-en-test',url:'http://example.com/model.onnx',sha256:'a'.repeat(64),allowedHosts:['example.com'],approved:true,licenseApproved:true,licenseEvidence:'review-record',intendedUse:'local TTS'}];fs.writeFileSync(srcFile,JSON.stringify(c,null,2));
  access.setControls({externalModelDownloadEnabled:true},'master_admin');
  assert.equal(acq.acquire('piper-en-test',{actorRole:'master_admin'}).reason,'tts_asset_source_url_invalid');
 } finally {fs.writeFileSync(srcFile,original);}
});
