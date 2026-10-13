'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('Android/iOS native host source is present for required Flutter channels',()=>{
  const android=path.join(root,'android','app','src','main','kotlin','com','kathavistaar','kv30','MainActivity.kt');
  const androidManifest=path.join(root,'android','app','src','main','AndroidManifest.xml');
  const ios=path.join(root,'ios','Runner','AppDelegate.swift');
  const iosInfo=path.join(root,'ios','Runner','Info.plist');
  for(const f of [android,androidManifest,ios,iosInfo])assert.equal(fs.existsSync(f),true,f);
  const a=fs.readFileSync(android,'utf8');
  const i=fs.readFileSync(ios,'utf8');
  for(const raw of ['kv30/native_permissions','kv30/native_fm','startRecording','pauseRecording','resumeRecording','stopRecording','renderMix'])assert.match(a,new RegExp(raw.replace('/','\\/')),`android missing ${raw}`);
  for(const raw of ['kv30/native_permissions','kv30/native_fm','startRecording','pauseRecording','resumeRecording','stopRecording','renderMix'])assert.match(i,new RegExp(raw.replace('/','\\/')),`ios missing ${raw}`);
  assert.match(fs.readFileSync(androidManifest,'utf8'),/RECORD_AUDIO/);
  assert.match(fs.readFileSync(iosInfo,'utf8'),/NSMicrophoneUsageDescription/);
});
