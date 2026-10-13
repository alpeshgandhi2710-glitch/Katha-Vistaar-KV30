'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('active release identity has no stale M41/M39/M37 manifest aliases',()=>{
  const v=JSON.parse(fs.readFileSync(path.join(root,'config/version.json'),'utf8'));
  const r=JSON.parse(fs.readFileSync(path.join(root,'config/release-registry-v30.json'),'utf8'));
  const m=JSON.parse(fs.readFileSync(path.join(root,'RELEASE-MANIFEST-v30.json'),'utf8'));
  assert.match(v.release_ref,/^REF-9\.2\.57\.18-R50-M(?:4[0-9]|5[0-9]|6[0-9]|7[0-9])-/);
  assert.equal(r.release_ref,v.release_ref); assert.equal(r.current_release_ref,v.release_ref);
  assert.equal(m.release,v.release_ref); assert.equal(m.releaseRef,v.release_ref); assert.equal(m.releaseLabel,v.release_label);
  assert.equal(m.currentReleaseRef,v.release_ref); assert.equal(m.current_release_ref,v.release_ref); assert.equal(m.currentContinuation,v.currentContinuation);
  assert.equal(m.parent,r.parentRelease);
});

test('sticker coin economic basis fails closed instead of inventing INR coin value',()=>{
  const {createRoyaltyEngine}=require('../core/royalty-engine');
  const e=createRoyaltyEngine(root,{events:new Map(),ledger:new Map()});
  assert.throws(()=>e.stickerEconomicBasis({coinCost:5,source:'coin'}),/coin_value_required/);
  assert.equal(e.stickerEconomicBasis({coinCost:5,coinValueInr:5,source:'coin'}).economicBasisInr,25);
  assert.equal(e.stickerEconomicBasis({cashAmount:25,source:'cash'}).economicBasisInr,25);
});

test('sticker royalty source has no silent ||1 coin-value fallback and direct gifts have a configured-rate guard',()=>{
  const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
  const royalty=fs.readFileSync(path.join(root,'core/royalty-engine.js'),'utf8');
  assert.doesNotMatch(server,/stickerCoinRate\|\|1/);
  assert.doesNotMatch(royalty,/stickerEconomicBasis\([^)]*coinValueInr=1/);
  assert.match(server,/sticker_coin_rate_not_configured/);
});
