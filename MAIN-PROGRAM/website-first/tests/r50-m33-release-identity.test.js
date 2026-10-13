const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
test('runtime BUILD_REF matches the current governed release reference',()=>{
 const v=JSON.parse(fs.readFileSync(path.join(ROOT,'config/version.json'),'utf8'));
 const src=fs.readFileSync(path.join(ROOT,'src/server.js'),'utf8');
 assert.match(src,new RegExp(`const BUILD_REF='${v.release_ref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));
});
