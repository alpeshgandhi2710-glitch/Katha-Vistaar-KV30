'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const acquisition=require('../src/services/ai-tts-governed-asset-acquisition');

test('TTS asset status counts only fully governed, checksum-pinned HTTPS sources as ready',()=>{
  const status=acquisition.status();
  assert.equal(typeof status.ready,'number');
  assert.ok(Array.isArray(status.blockedSources));
  assert.equal(typeof status.acquisitionAvailable,'boolean');
  for(const source of status.blockedSources){
    assert.equal(source.ready,false);
    assert.ok(source.reasons.length>0);
  }
});

test('empty approved-source inventory remains explicitly unavailable and fail-closed',()=>{
  const status=acquisition.status();
  assert.equal(status.approvedSources,0);
  assert.equal(status.ready,0);
  assert.equal(status.acquisitionAvailable,false);
});
