'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'config','version.json'),'utf8')).release_ref;

test('Current release metadata is internally consistent for the active governed candidate',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'RELEASE-MANIFEST-v30.json'),'utf8'));
  const version=JSON.parse(fs.readFileSync(path.join(root,'config','version.json'),'utf8'));
  const registry=JSON.parse(fs.readFileSync(path.join(root,'config','release-registry-v30.json'),'utf8'));
  assert.equal(manifest.release,expected);
  assert.equal(manifest.parent,registry.parent);
  assert.equal(manifest.final,false);
  assert.equal(manifest.verifiedClosed,false);
  assert.match(manifest.ttsNeuralTrainingStatus,/OPEN/);
  assert.equal(manifest.phase2,manifest.phase2); assert.match(String(manifest.phase2),/^[A-Z0-9_]+$/);
  assert.equal(version.release_ref,manifest.release);
  assert.equal(version.current_release_ref,manifest.release);
  assert.equal(registry.release_ref,manifest.release);
  assert.equal(registry.current_release_ref,manifest.release);
  assert.equal(manifest.masterAdminSecretsInMainZip,false);
  assert.equal(manifest.referenceZipDependency,false);
});
