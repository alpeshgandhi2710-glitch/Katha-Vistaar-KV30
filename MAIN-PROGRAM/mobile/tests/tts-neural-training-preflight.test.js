'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'tts-neural-training-preflight.js');
const api = require(script);
test('TTS preflight covers 23 languages, is offline-only, and never claims training without assets', () => {
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 10000, env: { ...process.env } });
  assert.equal(run.status, 0, run.stderr);
  const data = JSON.parse(run.stdout);
  assert.equal(data.languageCount, 23);
  assert.equal(data.languageReadiness.length, 23);
  assert.equal(data.mode, 'READ_ONLY_OFFLINE_PREFLIGHT');
  assert.equal(data.neuralTrainingExecuted, false);
  assert.equal(data.externalDownloadAttempted, false);
  assert.equal(data.externalUploadAttempted, false);
  assert.equal(data.productionPromotionPerformed, false);
  assert.equal(data.languageReadiness.every(x => x.ready === false), true);
  assert.equal(data.status, 'BLOCKED_TOOLCHAIN_OR_APPROVED_PER_LANGUAGE_CORPUS_AND_MODEL_ASSETS_MISSING');
});
test('corpus manifest fails closed unless approval, consent, rights, privacy, hash and minimum data are present', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kv30-tts-corpus-'));
  try {
    const file = path.join(temp, 'gu', 'manifest.json'); fs.mkdirSync(path.dirname(file), { recursive: true });
    const base = { language: 'gu-IN', approved: true, consentVerified: true, rightsConfirmed: true, privacyFiltered: true, licenseApproved: true, datasetSha256: 'a'.repeat(64), utteranceCount: 100, audioSeconds: 1800 };
    fs.writeFileSync(file, JSON.stringify(base));
    assert.equal(api.corpusManifestStatus(file, 'gu', 100, 1800).valid, true);
    fs.writeFileSync(file, JSON.stringify({ ...base, consentVerified: false }));
    assert.equal(api.corpusManifestStatus(file, 'gu', 100, 1800).valid, false);
    fs.writeFileSync(file, JSON.stringify({ ...base, datasetSha256: 'not-a-hash' }));
    assert.equal(api.corpusManifestStatus(file, 'gu', 100, 1800).valid, false);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
test('model manifest must be language-matched, approved and pin the actual model SHA-256', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kv30-tts-model-'));
  try {
    const file = path.join(temp, 'gu.onnx'); fs.writeFileSync(file, 'fixture-model-bytes');
    const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(file + '.json', JSON.stringify({ language: 'gu-IN', approved: true, licenseApproved: true, sha256: sha }));
    assert.equal(api.modelManifestStatus(file, 'gu').valid, true);
    fs.writeFileSync(file + '.json', JSON.stringify({ language: 'hi-IN', approved: true, licenseApproved: true, sha256: sha }));
    assert.equal(api.modelManifestStatus(file, 'gu').valid, false);
    fs.writeFileSync(file + '.json', JSON.stringify({ language: 'gu-IN', approved: true, licenseApproved: true, sha256: 'b'.repeat(64) }));
    assert.equal(api.modelManifestStatus(file, 'gu').valid, false);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
