const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const preload=fs.readFileSync(path.join(root,'preload.js'),'utf8');const web=fs.readFileSync(path.join(root,'..','website-first','public','app.js'),'utf8');
 test('Desktop uses canonical KV30 client contract',()=>{assert.match(preload,/platform: 'desktop-electron'/);assert.match(preload,/clientId: 'desktop-electron'/);assert.match(web,/desktop-electron/);assert.match(web,/X-KV30-State-Hash/);});
