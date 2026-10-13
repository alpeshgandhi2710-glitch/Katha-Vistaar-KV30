const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8');

test('R37 static UI/accessibility strings are routed through governed localization',()=>{
  for(const s of [
    'Sign in to continue to Katha Vistaar.',
    'Join Katha Vistaar to discover and create stories.',
    'Verify account using OTP',
    'Mobile OTP','Email OTP',
    'Checking availability…',
    'Auto-suggested; you can change it if available.',
    'Enter the 6-digit code sent to your registered mobile/email.'
  ]) assert.match(html,new RegExp(`data-i18n="[^"]+">${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<`));
  for(const s of ['Username, Email, or Mobile','Password','Show password','10-digit number']){
    assert.match(html,new RegExp(`${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}" data-i18n-(?:aria-label|title|placeholder)="`));
  }
  assert.match(app,/function applyTranslations\(\)\{[^}]*data-i18n-placeholder/);
  assert.match(app,/function applyTranslations\(\)\{[^}]*data-i18n-aria-label/);
  assert.match(app,/function applyTranslations\(\)\{[^}]*data-i18n-title/);
});

test('R37 dynamic dialogs use translation keys instead of fixed UI labels',()=>{
  assert.match(app,/id="kvActionClose" aria-label="\$\{x\('close'\)\}"/);
  assert.match(app,/id="kvActionCancel">\$\{x\('cancel'\)\}/);
  assert.match(app,/id="kvConfirmNo">\$\{x\('cancel'\)\}/);
  assert.match(app,/id="smartSubmit">\$\{x\('askInternalAi'\)\}/);
  assert.match(app,/smartPromptPlaceholder/);
  assert.doesNotMatch(app,/class="eyebrow">Internal AI<\/span><h2>\$\{kvIcon\('spark'\)\} Smart Assistant/);
});

test('R37 keeps governed English fallback behavior',()=>{
  assert.match(app,/function xStrict\(key,lang=state\.uiLanguage\)/);
  assert.match(app,/if\(v==null\|\|String\(v\)\.trim\(\)===''\|\|String\(v\)\.trim\(\)===`\[\$\{key\}\]`\)v=localeValue\('en',key\);/);
});
