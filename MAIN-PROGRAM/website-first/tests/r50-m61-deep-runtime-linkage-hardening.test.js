'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=path.resolve(root,'..');
const mobile=path.join(main,'mobile','lib');

test('R50-M61 deep runtime linkage: mobile mutation clients have deterministic canonical refresh/retry',()=>{
  const tools=fs.readFileSync(path.join(mobile,'mobile_tools.dart'),'utf8');
  const story=fs.readFileSync(path.join(mobile,'story_studio.dart'),'utf8');
  assert.match(tools,/class KvAdminApi/);
  assert.match(tools,/class KvHelpApi/);
  assert.match(tools,/authenticated&&res\.statusCode==409&&data\['error'\]=='stale_canonical_state'/);
  const admin=tools.slice(tools.indexOf('class KvAdminApi'),tools.indexOf('class KvSocialApi'));
  assert.doesNotMatch(admin,/return _request\(method,path,body:body\);\}/);
  assert.match(tools,/Future<Map<String,dynamic>> updateNotificationPreferences/);
  assert.match(story,/stale_canonical_state/);
});

test('R50-M61 deep runtime linkage: no fake-save mobile Settings/Audio placeholder remains',()=>{
  const tools=fs.readFileSync(path.join(mobile,'mobile_tools.dart'),'utf8');
  const mainDart=fs.readFileSync(path.join(mobile,'main.dart'),'utf8');
  assert.doesNotMatch(tools,/class KvToolScreen/);
  assert.doesNotMatch(mainDart,/KvToolScreen/);
  assert.match(mainDart,/updateProfile\(/);
  assert.match(mainDart,/updateNotificationPreferences\(/);
  assert.match(mainDart,/authenticatedAi\(/);
});

test('R50-M61 release metadata points to existing current evidence and all desktop tests are included',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'RELEASE-MANIFEST-v30.json'),'utf8'));
  const reg=JSON.parse(fs.readFileSync(path.join(root,'config','release-registry-v30.json'),'utf8'));
  assert.equal(manifest.release,reg.release_ref);
  const discoveredFiles=['tests','test'].flatMap(dir=>{const d=path.join(root,dir);return fs.existsSync(d)?fs.readdirSync(d).filter(f=>f.endsWith('.test.js')):[]}).length;
  const websitePattern=new RegExp('^(\\d+)/(\\d+) PASS across '+discoveredFiles+' website test files \\(concurrency=\\d+\\)$');
  assert.match(manifest.websiteRegression,websitePattern,'release manifest must reflect the discovered website test-file count');
  assert.equal(reg.websiteRegression,manifest.websiteRegression,'website regression metadata must agree across registries');
  assert.equal(reg.verification.websiteTestFiles,discoveredFiles,'website test-file count must be derived from discovered files');
  assert.equal(reg.verification.website,manifest.verification.website,'website test totals must agree across release metadata');
  assert.equal(reg.verification.desktopElectron,manifest.verification.desktopElectron,'Desktop totals must agree across release metadata');
  for(const rel of [manifest.sha256Evidence,manifest.releaseCertificate,manifest.acceptanceEvidence,manifest.sourceTruthEvidence,manifest.deepSourceAudit,manifest.finalCertificate,manifest.benchmarkAuditEvidence,manifest.benchmarkAuditManifest,manifest.benchmarkAuditHashManifest,manifest.localizationContractRef]) assert.equal(fs.existsSync(path.join(main,'..',rel)),true,`missing package evidence: ${rel}`);
  const desktopPkg=JSON.parse(fs.readFileSync(path.join(main,'desktop-electron','package.json'),'utf8'));
  assert.match(desktopPkg.scripts.test,/tests\/\*\.test\.js/);
  const governedRunner=path.join(main,'scripts','run-governed-regression.js');
  assert.equal(fs.existsSync(governedRunner),true,'release must include an authoritative regression/evidence reconciler');
  const mainPkg=JSON.parse(fs.readFileSync(path.join(main,'package.json'),'utf8'));
  assert.equal(mainPkg.scripts.test,'node scripts/run-governed-regression.js','the default MAIN-PROGRAM test command must invoke the governed all-platform gate');
  const websitePkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(websitePkg.scripts.test,'node ../scripts/run-governed-regression.js','the default Website test command must also invoke the governed all-platform gate');
  const appSource=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
  assert.match(appSource,/r\.headers\?\.get\?\.\('X-KV30-State-Hash'\)/,'fetch adapters without a Headers object must not crash canonical state reads');
  const runnerSource=fs.readFileSync(governedRunner,'utf8');
  assert.match(runnerSource,/output\.matchAll\(\/\^# tests/,'suite totals must be derived from actual TAP output');
  assert.match(runnerSource,/M61-CURRENT-REGRESSION-STATE\.json/,'fresh suite results must be recorded as a machine-readable current state');
  assert.doesNotMatch(runnerSource,/514\/514|211 website test files|Desktop Electron.*2\/2/,'the reconciler must not hard-code test totals');
  assert.match(runnerSource,/latestGateStatus = 'FAIL'/,'a failed future regression must invalidate current certification rather than leave a stale PASS');
  assert.match(runnerSource,/sourceRegressionReady = false/,'failed gate must mark source regression readiness false');
});
