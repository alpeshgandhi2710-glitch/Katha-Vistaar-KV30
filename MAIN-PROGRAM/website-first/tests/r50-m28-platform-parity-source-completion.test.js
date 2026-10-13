'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=path.resolve(root,'..');

test('R50-M28 platform source parity covers Web/Desktop-PWA/Android/iOS in Dev and Production',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','platform-parity-v30.json'),'utf8'));
 const env=JSON.parse(fs.readFileSync(path.join(root,'config','environment-parity-v30.json'),'utf8'));
 assert.equal(cfg.sourceOfTruth,'backend');
 for(const p of ['website','desktop_pwa','android','ios']) assert.ok(cfg.platforms[p],p);
 for(const e of ['development','production']) assert.equal(cfg.environments[e].sourceContract,'same');
 assert.equal(env.development.sourceContract,'same'); assert.equal(env.production.sourceContract,'same');
 assert.equal(env.desktopPwa.sourceContract,'same');
 for(const rel of [
  'website-first/public/manifest.webmanifest','website-first/public/sw.js',
  'mobile/android/app/src/main/kotlin/com/kathavistaar/kv30/MainActivity.kt',
  'mobile/android/app/src/main/AndroidManifest.xml',
  'mobile/ios/Runner/AppDelegate.swift','mobile/ios/Runner/Info.plist'
 ]) assert.equal(fs.existsSync(path.join(main,rel)),true,rel);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'public','manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone'); assert.ok(Array.isArray(manifest.display_override));
 assert.equal(manifest.scope,'/'); assert.equal(manifest.id,'/');
 assert.equal(manifest.icons.length,2); assert.equal(manifest.icons[0].type,'image/png');
});
