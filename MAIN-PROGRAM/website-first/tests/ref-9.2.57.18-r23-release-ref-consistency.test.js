const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(ROOT,'config/version.json'),'utf8'));
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'config/release-registry-v30.json'),'utf8'));
const expected=version.release_ref;
test('Current release reference is consistent across runtime version sources',()=>{
 
 assert.equal(version.release_ref,expected); assert.equal(version.release_label,registry.release_label); assert.equal(version.current_release_ref,expected);
 assert.equal(registry.release_ref,expected); assert.equal(registry.release_label,version.release_label); assert.equal(registry.current_release_ref,expected);
});
console.log('PASS R24 release reference consistency');
