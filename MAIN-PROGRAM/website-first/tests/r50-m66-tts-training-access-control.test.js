'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('TTS external model download and dataset upload are separate Master Admin controlled routes',()=>{
 const source=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
 assert.match(source,/\/api\/admin\/tts-training-access'&&req\.method==='GET'/);
 assert.match(source,/\/api\/admin\/tts-training-access'&&req\.method==='PATCH'/);
 assert.match(source,/master_admin_required_for_tts_transfer_policy/);
 assert.match(source,/tts_transfer_control_boolean_required/);
 assert.match(source,/tts_training_transfer_policy_updated/);
});
test('TTS access config does not blanket-deny external access and keeps Master Admin switches off by default',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'config/tts-training-access-control-v30.json'),'utf8'));
 assert.equal(cfg.authority,'master_admin_only');
 assert.equal(cfg.externalModelDownload.enabledByDefault,false);
 assert.equal(cfg.trainingDataUpload.enabledByDefault,false);
 assert.equal(cfg.localTraining.enabled,true);
 assert.equal(cfg.localTraining.networkRequired,false);
});
