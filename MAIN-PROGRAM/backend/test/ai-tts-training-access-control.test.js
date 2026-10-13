'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-tts-access-'));
process.env.KV_TTS_TRAINING_ACCESS_STATE=path.join(tmp,'policy.json');
process.env.KV_TTS_TRAINING_ACCESS_AUDIT=path.join(tmp,'audit.jsonl');
const access=require('../src/services/ai-tts-training-access-control');
test('external acquisition and training-data upload are Master-Admin controlled and off by default',()=>{
 const s=access.status();assert.equal(s.externalModelDownloadEnabled,false);assert.equal(s.trainingDataUploadEnabled,false);assert.equal(s.updatedBy,null);
});
test('normal admin cannot change external TTS training transfer controls',()=>{
 const r=access.setControls({externalModelDownloadEnabled:true,trainingDataUploadEnabled:true},'admin');assert.equal(r.ok,false);assert.equal(r.reason,'master_admin_required_for_tts_transfer_policy');assert.equal(access.status().externalModelDownloadEnabled,false);
});
test('Master Admin can independently enable or disable download and upload paths',()=>{
 let r=access.setControls({externalModelDownloadEnabled:true},'master_admin');assert.equal(r.ok,true);assert.equal(r.externalModelDownloadEnabled,true);assert.equal(r.trainingDataUploadEnabled,false);
 r=access.setControls({trainingDataUploadEnabled:true},'master_admin');assert.equal(r.ok,true);assert.equal(r.trainingDataUploadEnabled,true);assert.equal(r.externalModelDownloadEnabled,true);
 r=access.setControls({externalModelDownloadEnabled:false,trainingDataUploadEnabled:false},'master_admin');assert.equal(r.ok,true);assert.equal(r.externalModelDownloadEnabled,false);assert.equal(r.trainingDataUploadEnabled,false);
});
test('download authorization requires Master Admin switch, external gate, pinned source, checksum and license review',()=>{
 access.setControls({externalModelDownloadEnabled:true},'master_admin');
 const base={direction:'download',actorRole:'master_admin',externalLayerEnabled:true,externalGateApproved:true,pinnedSource:true,sha256:'a'.repeat(64),licenseReviewed:true};
 assert.equal(access.authorizeTransfer({...base,externalGateApproved:false}).reason,'master_admin_external_service_gate_required');
 assert.equal(access.authorizeTransfer({...base,sha256:'bad'}).reason,'pinned_model_source_and_sha256_required');
 assert.equal(access.authorizeTransfer(base).ok,true);
});
test('training-data upload requires its own Master Admin switch plus consent, rights and privacy review',()=>{
 access.setControls({trainingDataUploadEnabled:true},'master_admin');
 const base={direction:'upload',actorRole:'master_admin',externalLayerEnabled:true,externalGateApproved:true,consent:true,rightsConfirmed:true,privacyReviewed:true};
 assert.equal(access.authorizeTransfer({...base,consent:false}).reason,'tts_training_data_consent_required');
 assert.equal(access.authorizeTransfer({...base,privacyReviewed:false}).reason,'tts_training_data_privacy_review_required');
 assert.equal(access.authorizeTransfer(base).ok,true);
});
test('transfer decisions are auditable without storing prompts, audio text or credentials',()=>{
 const text=fs.readFileSync(process.env.KV_TTS_TRAINING_ACCESS_AUDIT,'utf8');assert.match(text,/denied/);assert.match(text,/allowed/);assert.doesNotMatch(text,/api[_-]?key|password|trainingText|audioText/i);
});
