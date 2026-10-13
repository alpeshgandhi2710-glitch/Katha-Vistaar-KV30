'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const tts=require('../src/services/ai-tts-runtime');
test('TTS runtime exposes real local provider detection',()=>{const s=tts.providerStatus();assert.equal(typeof s.piper,'boolean');assert.equal(typeof s.espeak,'boolean');assert.equal(typeof s.neuralReady,'boolean');});
test('TTS refuses empty input',async()=>{const r=await tts.synthesize({text:''});assert.equal(r.ok,false);assert.equal(r.reason,'empty_text');});
