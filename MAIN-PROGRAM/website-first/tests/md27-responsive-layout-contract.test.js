const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
assert.match(html,/name=["']viewport["'][^>]*width=device-width/i,'viewport meta missing');
assert.match(css,/MD27 responsive-view contract/,'MD27 responsive contract marker missing');
for(const token of [
  '@media (max-width:720px)',
  '@media (max-width:420px)',
  '@media (min-width:721px) and (max-width:1100px)',
  'dialog#languagePicker{width:min(760px,calc(100vw - 24px))',
  'dialog#languagePicker .language-list',
  '.content-grid,.creator-tool-grid,.editor-bottom,.competition-grid{grid-template-columns:1fr}',
  '.format-studio-grid,.payment-shell{grid-template-columns:minmax(0,1fr)',
  '.language-governance-grid,.language-governance-evidence{grid-template-columns:1fr}',
  '.site-header nav#primaryNav{width:100%;max-width:100%'
]) assert.ok(css.includes(token),`responsive contract missing: ${token}`);
console.log('MD27 responsive layout contract: PASS');
