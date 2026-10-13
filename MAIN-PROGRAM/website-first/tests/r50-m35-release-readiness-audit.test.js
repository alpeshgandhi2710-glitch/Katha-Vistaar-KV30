const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');

test('M35 UI localization contract has no hardcoded account prompt text',()=>{
 const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
 assert.match(html,/data-i18n="dontHaveAccount"/);
 assert.match(html,/data-i18n="alreadyHaveAccount"/);
});

