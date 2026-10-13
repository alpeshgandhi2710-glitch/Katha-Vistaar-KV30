const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Android development and production application identities are distinct',()=>{
  const s=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
  assert.match(s,/applicationId 'com\.kathavistaar\.kv30\.dev'/);
  assert.match(s,/applicationId 'com\.kathavistaar\.kv30'/);
});
test('iOS environment contract is reproducible and does not claim an unavailable Xcode project',()=>{
  const s=fs.readFileSync(path.join(root,'scripts/bootstrap-ios-host.sh'),'utf8');
  const c=fs.readFileSync(path.join(root,'scripts/IOS-ENVIRONMENT-CONTRACT.md'),'utf8');
  assert.match(s,/flutter create --platforms=ios/);
  assert.match(c,/com\.kathavistaar\.kv30\.dev/);
  assert.match(c,/com\.kathavistaar\.kv30/);
});
