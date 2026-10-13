'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..', '..', '..');
const verifier = path.join(root, 'MAIN-PROGRAM/scripts/verify-native-build-output.js');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/kv30-platform-build.yml'), 'utf8');
function hash(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
function fixture(dir, platform, files) {
  fs.mkdirSync(dir, {recursive:true});
  const artifacts=[];
  for (const [name, content] of Object.entries(files)) {
    const file=path.join(dir,...name.split('/')); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,content);
    const bytes=fs.readFileSync(file); artifacts.push({path:name,bytes:bytes.length,sha256:hash(bytes)});
  }
  fs.writeFileSync(path.join(dir,'native-build-result.json'),JSON.stringify({schema:'kv30.native-build-result.v1',platform,status:'PASS',artifacts}));
}
test('native CI workflow gates release evidence on Android, iOS and Desktop success', () => {
  assert.match(workflow,/native-release-acceptance:/);
  assert.match(workflow,/needs: \[android, ios, desktop\]/);
  assert.match(workflow,/verify-native-build-output\.js release/);
  assert.match(workflow,/flutter build appbundle --release --flavor production/);
  assert.match(workflow,/flutter build ios --release --no-codesign/);
  assert.match(workflow,/Android emulator launch smoke acceptance/);
  assert.match(workflow,/iOS Simulator launch smoke acceptance/);
  assert.match(workflow,/FINAL-AUDIT-EVIDENCE\/R50-M76\/native-build-evidence\/native-build-release-acceptance\.json/);
  assert.doesNotMatch(workflow,/FINAL-AUDIT-EVIDENCE\/R50-M73\/native-build-evidence/);
  const verifierSource=fs.readFileSync(verifier,'utf8');
  assert.match(verifierSource,/invalid ZIP-based Android artifact signature/);
  assert.match(verifierSource,/invalid Mach-O executable signature/);
  assert.match(verifierSource,/missing\/empty simulator evidence file/);
  assert.match(verifierSource,/FINAL-AUDIT-EVIDENCE\/R50-M76\/native-build-evidence/);
  assert.doesNotMatch(verifierSource,/FINAL-AUDIT-EVIDENCE\/R50-M73\/native-build-evidence/);
});
test('native build verifier accepts only hash-matching Android and iOS artifacts', t => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-native-verify-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const base=path.join(temp,'artifacts');
  fixture(path.join(base,'android'),'android',{
    'app-development-release.apk':Buffer.from('PK\x03\x04development-binary-fixture'),
    'app-production-release.apk':Buffer.from('PK\x03\x04production-binary-fixture'),
    'app-production-release.aab':Buffer.from('PK\x03\x04bundle-binary-fixture')
  });
  fixture(path.join(base,'ios'),'ios',{
    'Runner.app/Info.plist':'plist-fixture',
    'Runner.app/Runner':Buffer.concat([Buffer.from([0xcf,0xfa,0xed,0xfe]),Buffer.from('runner-binary-fixture')])
  });
  fs.writeFileSync(path.join(base,'android','device-smoke.json'),JSON.stringify({status:'PASS',kind:'android_emulator_launch_smoke',assetAcceptance:'PASS-ASSET',physicalDeviceExecution:'NOT_CLAIMED'}));
  fs.writeFileSync(path.join(base,'android','emulator-launch.png'),Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x01]));
  fs.writeFileSync(path.join(base,'android','emulator-logcat-errors.txt'),'No fatal exception found\n');
  const iosSmoke=path.join(base,'ios-simulator-smoke','device-smoke.json');
  fs.mkdirSync(path.dirname(iosSmoke),{recursive:true});
  fs.writeFileSync(iosSmoke,JSON.stringify({status:'PASS',kind:'ios_simulator_launch_smoke',assetAcceptance:'PASS-ASSET',physicalDeviceExecution:'NOT_CLAIMED'}));
  fs.writeFileSync(path.join(path.dirname(iosSmoke),'launch.png'),Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x01]));
  fs.writeFileSync(path.join(path.dirname(iosSmoke),'launch.log'),'com.kathavistaar.kv30: launch succeeded\n');
  const output=path.join(temp,'release.json');
  const run=()=>spawnSync(process.execPath,[verifier,'release','--artifact-root',base,'--output',output],{encoding:'utf8',timeout:10000});
  const pass=run();
  assert.equal(pass.status,0,pass.stderr);
  const result=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(result.status,'PASS_BUILD_AND_SIMULATOR_SMOKE_ONLY');
  assert.equal(result.binaryBuildVerified,true);
  assert.equal(result.physicalDeviceAcceptance,'PASS-ASSET');
  assert.equal(result.physicalDeviceExecution,'NOT_CLAIMED');
  assert.equal(result.simulatorSmokeAcceptance,'PASS');
  assert.equal(result.productionReleaseReady,false);
  const missingScreenshot=path.join(base,'ios-simulator-smoke','launch.png');
  fs.unlinkSync(missingScreenshot);
  const noScreenshot=run();
  assert.notEqual(noScreenshot.status,0,'missing simulator screenshot must fail acceptance');
  assert.match(noScreenshot.stderr,/missing\/empty simulator evidence file launch\.png/);
  fs.writeFileSync(missingScreenshot,Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x01]));
  fs.appendFileSync(path.join(base,'android','app-production-release.apk'),'tampered');
  const fail=run();
  assert.notEqual(fail.status,0,'tampered binary must fail hash verification');
  assert.match(fail.stderr,/hash\/size mismatch/);
  // A manifest cannot pass by listing only a convenient subset of platform outputs.
  fs.writeFileSync(path.join(base,'android','app-production-release.apk'),'development-binary-fixture');
  const androidManifest=path.join(base,'android','native-build-result.json');
  const original=JSON.parse(fs.readFileSync(androidManifest,'utf8'));
  original.artifacts=original.artifacts.filter(item=>item.path!=='app-production-release.aab');
  fs.writeFileSync(androidManifest,JSON.stringify(original));
  const missingRequired=run();
  assert.notEqual(missingRequired.status,0,'missing production AAB must fail release acceptance');
  assert.match(missingRequired.stderr,/required artifact missing from manifest: app-production-release\.aab/);
  const badSignatureDir=path.join(temp,'bad-signature');
  fixture(path.join(badSignatureDir,'android'),'android',{
    'app-development-release.apk':'not-a-real-zip',
    'app-production-release.apk':Buffer.from('PK\x03\x04production'),
    'app-production-release.aab':Buffer.from('PK\x03\x04bundle')
  });
  const badSignature=spawnSync(process.execPath,[verifier,'release','--artifact-root',badSignatureDir,'--output',path.join(temp,'bad.json')],{encoding:'utf8',timeout:10000});
  assert.notEqual(badSignature.status,0,'text fixture with APK extension must not pass as a native binary');
  assert.match(badSignature.stderr,/invalid ZIP-based Android artifact signature/);
});
