'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');

test('30A Stitch merge keeps supplied authentication visual contract and real controls',()=>{
  assert.match(html,/auth-stitch-logo/);
  assert.match(html,/katha-vistaar-icon\.png/);
  assert.match(html,/id="loginIdentifier"[^>]*name="identifier"/);
  assert.match(html,/id="loginPassword"[^>]*name="password"/);
  assert.match(html,/id="registerForm"/);
  assert.match(html,/name="userId"/);
  assert.match(html,/name="verificationMethod"/);
  assert.match(html,/id="otpDialog"/);
  assert.equal((html.match(/data-otp-digit/g)||[]).length,6);
  assert.match(html,/data-password-toggle="loginPassword"/);
  assert.match(html,/data-password-toggle="registerPassword"/);
  assert.match(html,/data-password-toggle="resetNewPassword"/);
  assert.match(css,/--kv-stitch-primary:#5a18d6/);
  assert.match(css,/--kv-stitch-bg:#fcf9f8/);
  assert.match(css,/\.auth-stitch-logo/);
  assert.match(css,/\.auth-input-control/);
});

test('30A Stitch merge uses SVG icon system for primary navigation and avoids emoji-only controls',()=>{
  assert.match(app,/function kvIcon\(name\)/);
  for(const icon of ['login','userPlus','message','dashboard','bell','settings','help','coins','sticker','logout','book','comic','audio','reel','plus','shield','palette']) assert.match(app,new RegExp(`${icon}\\s*:`));
  assert.doesNotMatch(app,/data-open-login>⌁/);
  assert.doesNotMatch(app,/data-register>＋/);
  assert.doesNotMatch(app,/data-logout>↪️/);
});
