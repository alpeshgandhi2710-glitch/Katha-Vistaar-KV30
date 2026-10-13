# R50-M66 — TTS training access controls and honest acceptance state

Date: 2026-10-09
Baseline: R50-M65 source package; Master Control v26 remains immutable; MD27 remains current working governance.

## Implemented
- Added `website-first/config/tts-training-access-control-v30.json` as the TTS transfer policy contract.
- Added `backend/src/services/ai-tts-training-access-control.js` with independent Master Admin switches for external model downloads and training-data uploads, default-off policy, transfer preconditions, and audit events that avoid storing credentials or training text.
- Added `GET/PATCH /api/admin/tts-training-access`; both require an authenticated Master Admin. Normal Admin cannot change this policy.
- Removed the blanket `networkAccess: DENY` and `externalUpload: false` fields from the TTS model lifecycle config. External acquisition and data transfer are now explicitly Master-Admin-controlled rather than categorically forbidden. Local training does not require network access.
- Lifecycle status reads the effective Master Admin policy; production model promotion remains gated by real training artifacts, evaluation, Master Admin approval, versioning, and rollback.

## Focused tests
- `backend/test/ai-tts-training-access-control.test.js`: 6/6 PASS (Master Admin policy, separate toggles, pinned SHA/license, consent/rights/privacy and audit).
- `backend/test/ai-tts-model-lifecycle.test.js`: 7/7 PASS.
- `website-first/tests/r50-m66-tts-training-access-control.test.js`: 2/2 PASS.
- `node --check website-first/src/server.js`: PASS.

## Governed regression
- Website: 516/516 PASS across 212 website test files.
- Backend: 93/93 PASS across 22 test files.
- Mobile: 25/25 PASS.
- Desktop: 3/3 PASS.
- Static audit: 351 JavaScript syntax checks, 297 JSON files parsed, 325 active JS import files, 0 unresolved active relative imports before final M66 test additions.

## Acceptance boundary
The access-control code and governance routes are implemented and tested. Actual neural training is not claimed: this execution environment does not have `piper_train`, a compatible pinned trainer, model artifacts, or a governed corpus for all required languages. Do not close neural TTS or 23-language offline speech acceptance until actual model artifacts are trained/evaluated and each language is demonstrated through local inference.
