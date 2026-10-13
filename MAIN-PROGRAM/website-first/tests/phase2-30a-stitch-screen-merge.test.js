'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'public/style.css'),'utf8');

test('P2-30B Stitch v30 screen merge has real visual assets and functional navigation targets',()=>{
  for(const f of ['home-feature-art.png','continue-midnight.png','rani-durgavati.png','chai-aur-charcha.png']) assert.equal(fs.existsSync(path.join(ROOT,'public/assets/stitch-v30',f)),true,f);
  assert.match(app,/stitch-home-hero/); assert.match(app,/stitch-continue-card/); assert.match(app,/stitch-content-card/); assert.match(app,/data-public-profile/);
  assert.match(html,/data-route="discover"/); assert.match(html,/data-route="write"/); assert.match(html,/data-route="notifications"/); assert.match(html,/data-route="library"/);
  assert.match(css,/--kv-stitch-primary:#5a18d6/); assert.match(css,/stitch-home-hero/); assert.match(css,/stitch-content-card/);
});

test('P2-30B Stitch bottom navigation uses functional SVG icons, not emoji-only controls',()=>{
  assert.match(html,/aria-label="Home"[\s\S]*kv-svg-icon/); assert.match(html,/aria-label="Discover"[\s\S]*kv-svg-icon/); assert.match(html,/aria-label="Create"[\s\S]*kv-svg-icon/); assert.match(html,/aria-label="Alerts"[\s\S]*kv-svg-icon/); assert.match(html,/aria-label="Profile"[\s\S]*kv-svg-icon/);
});
