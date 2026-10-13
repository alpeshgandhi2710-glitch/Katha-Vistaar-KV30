#!/usr/bin/env node
'use strict';
// Read-only, offline-only TTS training preflight. It never downloads/uploads assets or trains models.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'website-first');
const supportPath = path.join(site, 'config', 'ai-language-support-v30.json');
const lifecyclePath = path.join(site, 'config', 'tts-model-lifecycle-v30.json');
const support = JSON.parse(fs.readFileSync(supportPath, 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
function commandStatus(command) {
  // Avoid interpolating configuration values into a shell command.
  if (!/^[A-Za-z0-9_.+-]+$/.test(command)) return { available: false, path: null, reason: 'invalid_command_name' };
  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const dir of envPath) {
    const candidate = path.join(dir, command);
    try { fs.accessSync(candidate, fs.constants.X_OK); if (fs.statSync(candidate).isFile()) return { available: true, path: candidate }; } catch {}
  }
  return { available: false, path: null };
}
function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file, predicate, out);
    else if (ent.isFile() && predicate(file)) out.push(file);
  }
  return out;
}
function sha256(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value); }
function corpusManifestStatus(file, code, minimumUtterances, minimumAudioSeconds) {
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const lang = String(m.language || m.languageCode || '').toLowerCase().split(/[-_]/)[0];
    const hasLangPath = file.split(path.sep).some(part => part.toLowerCase() === code);
    const valid = (lang === code || (!lang && hasLangPath)) && m.approved === true && m.consentVerified === true && m.rightsConfirmed === true && m.privacyFiltered === true && m.licenseApproved === true && sha256(m.datasetSha256 || m.sha256) && Number(m.utteranceCount) >= minimumUtterances && Number(m.audioSeconds) >= minimumAudioSeconds;
    return { file, valid, language: lang || (hasLangPath ? code : null), reasons: valid ? [] : ['requires_language_identity_approval_consent_rights_privacy_license_sha256_and_minimum_audio_evidence'] };
  } catch { return { file, valid: false, language: null, reasons: ['invalid_json'] }; }
}
function modelManifestStatus(modelFile, code) {
  const sidecars = [`${modelFile}.json`, modelFile.replace(/\.onnx$/i, '.manifest.json')];
  for (const sidecar of sidecars) {
    if (!fs.existsSync(sidecar)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
      const lang = String(m.language || m.languageCode || '').toLowerCase().split(/[-_]/)[0];
      const actual = require('node:crypto').createHash('sha256').update(fs.readFileSync(modelFile)).digest('hex');
      const valid = lang === code && m.approved === true && m.licenseApproved === true && sha256(m.sha256) && m.sha256.toLowerCase() === actual;
      if (valid) return { file: modelFile, manifest: sidecar, valid: true, reasons: [] };
    } catch {}
  }
  return { file: modelFile, manifest: null, valid: false, reasons: ['missing_or_unapproved_hash_pinned_language_model_manifest'] };
}
function buildPreflight(options = {}) {
  const languages = [...new Set(support.languages.map(x => String(x.code).toLowerCase()))];
  const modelRoot = options.modelRoot || path.join(site, 'data', 'tts-models');
  const corpusRoots = options.corpusRoots || [path.join(site, 'data', 'tts-training-corpora'), path.join(root, 'data', 'tts-training-corpora')];
  const manifests = corpusRoots.flatMap(dir => walk(dir, file => path.basename(file).toLowerCase() === 'manifest.json'));
  const models = walk(modelRoot, file => file.toLowerCase().endsWith('.onnx'));
  const minimumUtterances = Number(lifecycle.minimumUtterances || 100);
  const minimumAudioSeconds = Number(lifecycle.minimumAudioSeconds || 1800);
  const trainer = commandStatus(String(lifecycle.trainer?.command || 'piper_train'));
  const synthesizer = commandStatus('piper');
  const runtime = commandStatus('onnxruntime');
  const languageReadiness = languages.map(code => {
    const corpusCandidates = manifests.map(file => corpusManifestStatus(file, code, minimumUtterances, minimumAudioSeconds)).filter(x => x.language === code);
    const approvedCorpus = corpusCandidates.find(x => x.valid) || null;
    const modelCandidates = models.filter(file => {
      const rel = path.relative(modelRoot, file).split(path.sep).map(x => x.toLowerCase());
      return rel.includes(code) || path.basename(file).toLowerCase().startsWith(`${code}-`);
    }).map(file => modelManifestStatus(file, code));
    const approvedModel = modelCandidates.find(x => x.valid) || null;
    const ready = !!approvedCorpus && !!approvedModel;
    return { language: code, approvedCorpusManifestPresent: !!approvedCorpus, corpusManifestCount: corpusCandidates.length, approvedModelPresent: !!approvedModel, modelCandidateCount: modelCandidates.length, ready, blockers: [...(!approvedCorpus ? ['approved_corpus_manifest_missing_or_invalid'] : []), ...(!approvedModel ? ['approved_hash_pinned_language_model_missing_or_invalid'] : [])] };
  });
  const allLanguageAssetsReady = languages.length === 23 && languageReadiness.length === 23 && languageReadiness.every(x => x.ready);
  const toolchainReady = trainer.available && synthesizer.available && runtime.available;
  const ready = allLanguageAssetsReady && toolchainReady;
  return {
    schema: 'kv30.tts-neural-training-preflight.v2', release: 'R50-M73', checkedAt: new Date().toISOString(), mode: 'READ_ONLY_OFFLINE_PREFLIGHT',
    languageCount: languages.length, languageCodes: languages,
    toolchain: { trainer, synthesizer, onnxRuntime: runtime },
    assets: { neuralOnnxModelCount: models.length, corpusManifestCount: manifests.length, approvedCorpusManifestCount: languageReadiness.filter(x => x.approvedCorpusManifestPresent).length, approvedLanguageModelCount: languageReadiness.filter(x => x.approvedModelPresent).length, corpusRootsChecked: corpusRoots.map(x => path.relative(root, x)) },
    requirements: { minimumUtterances, minimumAudioSeconds, consentRequired: lifecycle.consentRequired === true, rightsConfirmationRequired: lifecycle.rightsConfirmationRequired === true, privacyFilteredDatasetRequired: lifecycle.privacyFilteredDatasetRequired === true, corpusManifestMustBeLanguageScopedAndHashPinned: true, modelManifestMustBeLanguageScopedAndHashPinned: true, externalDownload: 'MASTER_ADMIN_CONTROLLED_DEFAULT_OFF', trainingDataUpload: 'MASTER_ADMIN_CONTROLLED_DEFAULT_OFF', automaticProductionPromotion: false },
    languageReadiness,
    status: ready ? 'READY_FOR_GOVERNED_TRAINING_REVIEW' : 'BLOCKED_TOOLCHAIN_OR_APPROVED_PER_LANGUAGE_CORPUS_AND_MODEL_ASSETS_MISSING',
    neuralTrainingExecuted: false, externalDownloadAttempted: false, externalUploadAttempted: false, productionPromotionPerformed: false
  };
}
if (require.main === module) {
  const result = buildPreflight();
  const output = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.languageCount !== 23) process.exitCode = 2;
}
module.exports = { buildPreflight, corpusManifestStatus, modelManifestStatus, sha256 };
