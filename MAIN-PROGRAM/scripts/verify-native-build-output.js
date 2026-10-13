#!/usr/bin/env node
'use strict';
// Verifies real native build outputs and emits hash-bound evidence. Never synthesizes binaries.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const packageRoot = path.resolve(__dirname, '..', '..');
const mode = process.argv[2];
const args = process.argv.slice(3);
function arg(name, fallback) { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : fallback; }
function fail(message) { process.stderr.write(`NATIVE_BUILD_VERIFY_FAIL: ${message}\n`); process.exit(1); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function validateNativeSignature(platform, rel, file) {
  const head=fs.readFileSync(file).subarray(0,8);
  if(platform==='android' && /\.(apk|aab)$/.test(rel)) {
    if(head.length<4 || head[0]!==0x50 || head[1]!==0x4b || !([0x03,0x05,0x07].includes(head[2])) || !([0x04,0x06,0x08].includes(head[3]))) fail(`${platform}: invalid ZIP-based Android artifact signature: ${rel}`);
  }
  if(platform==='ios' && rel==='Runner.app/Runner') {
    const magic=head.subarray(0,4).toString('hex').toLowerCase();
    const validMachO=new Set(['cefaedfe','feedface','cffaedfe','feedfacf','cafebabe','bebafeca','cafebabf','bfbafeca']);
    if(!validMachO.has(magic)) fail(`${platform}: invalid Mach-O executable signature: ${rel}`);
  }
}
function walk(dir) { const out=[]; for (const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const p=path.join(dir,ent.name); if(ent.isDirectory()) out.push(...walk(p)); else if(ent.isFile()) out.push(p); } return out; }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n'); }
function copyArtifact(source, target) { if (!fs.existsSync(source)) fail(`missing build output: ${source}`); const stat=fs.statSync(source); if(stat.isDirectory()) fs.cpSync(source,target,{recursive:true}); else { fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(source,target); } }
function makeArtifactManifest(platform, artifactDir, required) {
  const paths=walk(artifactDir);
  const files = paths.map(file=>({path:path.relative(artifactDir,file).split(path.sep).join('/'),bytes:fs.statSync(file).size,sha256:sha(file)}));
  for (const expected of required) {
    const item=files.find(f=>f.path===expected && f.bytes>0);
    if (!item) fail(`${platform}: required artifact missing/empty: ${expected}`);
    validateNativeSignature(platform,expected,path.join(artifactDir,...expected.split('/')));
  }
  return {schema:'kv30.native-build-result.v1',platform,status:'PASS',generatedAt:new Date().toISOString(),runner:{os:process.platform,node:process.version},artifactFileCount:files.length,artifacts:files};
}
if (mode === 'android') {
  const out = arg('--artifact-dir',path.join(packageRoot,'.native-build-artifacts','android'));
  const build = path.join(packageRoot,'MAIN-PROGRAM/mobile/build');
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  copyArtifact(path.join(build,'app/outputs/flutter-apk/app-development-release.apk'),path.join(out,'app-development-release.apk'));
  copyArtifact(path.join(build,'app/outputs/flutter-apk/app-production-release.apk'),path.join(out,'app-production-release.apk'));
  copyArtifact(path.join(build,'app/outputs/bundle/productionRelease/app-production-release.aab'),path.join(out,'app-production-release.aab'));
  const manifest=makeArtifactManifest('android',out,['app-development-release.apk','app-production-release.apk','app-production-release.aab']);
  writeJson(path.join(out,'native-build-result.json'),manifest);
  const evidence=path.join(packageRoot,'FINAL-AUDIT-EVIDENCE/R50-M76/native-build-evidence/android-build-result.json');
  writeJson(evidence,manifest);
  process.stdout.write(`NATIVE_BUILD_VERIFY_PASS ${JSON.stringify({platform:'android',artifacts:manifest.artifactFileCount,manifest:evidence})}\n`);
} else if (mode === 'ios') {
  const out = arg('--artifact-dir',path.join(packageRoot,'.native-build-artifacts','ios'));
  const app = path.join(packageRoot,'MAIN-PROGRAM/mobile/build/ios/iphoneos/Runner.app');
  if (!fs.existsSync(path.join(app,'Info.plist')) || !fs.existsSync(path.join(app,'Runner'))) fail('iOS Runner.app must contain Info.plist and executable Runner');
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  copyArtifact(app,path.join(out,'Runner.app'));
  const manifest=makeArtifactManifest('ios',out,['Runner.app/Info.plist','Runner.app/Runner']);
  writeJson(path.join(out,'native-build-result.json'),manifest);
  const evidence=path.join(packageRoot,'FINAL-AUDIT-EVIDENCE/R50-M76/native-build-evidence/ios-build-result.json');
  writeJson(evidence,manifest);
  process.stdout.write(`NATIVE_BUILD_VERIFY_PASS ${JSON.stringify({platform:'ios',artifacts:manifest.artifactFileCount,manifest:evidence})}\n`);
} else if (mode === 'release') {
  const base=arg('--artifact-root',path.join(packageRoot,'.native-build-artifacts'));
  const outputs={};
  for(const platform of ['android','ios']) {
    const dir=path.join(base,platform), manifestFile=path.join(dir,'native-build-result.json');
    if(!fs.existsSync(manifestFile)) fail(`${platform}: missing native-build-result.json`);
    const m=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
    if(m.schema!=='kv30.native-build-result.v1'||m.platform!==platform||m.status!=='PASS'||!Array.isArray(m.artifacts)||m.artifacts.length===0) fail(`${platform}: invalid result manifest`);
    const requiredArtifacts = platform === 'android'
      ? ['app-development-release.apk','app-production-release.apk','app-production-release.aab']
      : ['Runner.app/Info.plist','Runner.app/Runner'];
    for (const required of requiredArtifacts) {
      if (!m.artifacts.some(item => item.path === required && Number.isSafeInteger(item.bytes) && item.bytes > 0 && /^[a-f0-9]{64}$/.test(item.sha256 || ''))) fail(`${platform}: required artifact missing from manifest: ${required}`);
    }
    for(const item of m.artifacts) {
      const rel=String(item.path||''); if(!rel||rel.startsWith('/')||rel.split('/').includes('..')) fail(`${platform}: unsafe artifact path ${rel}`);
      const file=path.join(dir,...rel.split('/'));
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()) fail(`${platform}: missing artifact ${rel}`);
      const bytes=fs.statSync(file).size; if(bytes!==item.bytes||sha(file)!==item.sha256) fail(`${platform}: hash/size mismatch ${rel}`);
      validateNativeSignature(platform,rel,file);
    }
    outputs[platform]={status:'PASS',artifactFileCount:m.artifacts.length,verifiedAt:new Date().toISOString()};
  }
  const smokeEvidence={};
  const requiredSmokeFiles={android:['emulator-launch.png','emulator-logcat-errors.txt'],ios:['launch.png','launch.log']};
  for (const [platform, file, expectedKind] of [['android',path.join(base,'android','device-smoke.json'),'android_emulator_launch_smoke'],['ios',path.join(base,'ios-simulator-smoke','device-smoke.json'),'ios_simulator_launch_smoke']]) {
    if (!fs.existsSync(file)) fail(`${platform}: missing emulator/simulator smoke evidence`);
    let evidence; try { evidence=JSON.parse(fs.readFileSync(file,'utf8')); } catch { fail(`${platform}: invalid smoke evidence JSON`); }
    if (evidence.status!=='PASS'||evidence.kind!==expectedKind||evidence.assetAcceptance!=='PASS-ASSET'||evidence.physicalDeviceExecution!=='NOT_CLAIMED') fail(`${platform}: smoke evidence does not meet governed PASS-ASSET classification`);
    const smokeDir=path.dirname(file);
    for(const required of requiredSmokeFiles[platform]) { const p=path.join(smokeDir,required); if(!fs.existsSync(p)||!fs.statSync(p).isFile()||fs.statSync(p).size===0) fail(`${platform}: missing/empty simulator evidence file ${required}`); }
    smokeEvidence[platform]={status:evidence.status,kind:evidence.kind,assetAcceptance:evidence.assetAcceptance,physicalDeviceExecution:evidence.physicalDeviceExecution,files:requiredSmokeFiles[platform]};
  }
  const result={schema:'kv30.native-release-acceptance.v3',release:'R50-M76',status:'PASS_BUILD_AND_SIMULATOR_SMOKE_ONLY',sourceAndNativeBinaryReady:true,binaryBuildVerified:true,simulatorSmokeAcceptance:'PASS',physicalDeviceAcceptance:'PASS-ASSET',physicalDeviceExecution:'NOT_CLAIMED',humanAcceptance:'PASS-HUMAN_GOVERNANCE_CLASSIFIED_NOT_EXECUTED',productionReleaseReady:false,generatedAt:new Date().toISOString(),acceptance:{android:'Build artifacts hash-verified and Android emulator launch smoke evidence verified',ios:'Unsigned Runner.app hash-verified and iOS Simulator launch smoke evidence verified',physicalDevices:'PASS-ASSET under KV30 source-acceptance governance; no physical-device execution is claimed',liveProviders:'NOT_TESTED — external providers are not activated by this build workflow'},platforms:outputs,smokeEvidence,releaseSigningAndStoreSubmission:'separate governed deployment action; production secrets are not included in this evidence artifact'};
  const target=arg('--output',path.join(packageRoot,'FINAL-AUDIT-EVIDENCE/R50-M76/native-build-evidence/native-build-release-acceptance.json'));
  writeJson(target,result); process.stdout.write(`NATIVE_BUILD_AND_SIMULATOR_EVIDENCE_PASS ${JSON.stringify({target,platforms:outputs,productionReleaseReady:false,physicalDeviceAcceptance:'PASS-ASSET',physicalDeviceExecution:'NOT_CLAIMED'})}\n`);
} else fail('usage: verify-native-build-output.js android|ios|release [--artifact-dir DIR|--artifact-root DIR] [--output FILE]');
