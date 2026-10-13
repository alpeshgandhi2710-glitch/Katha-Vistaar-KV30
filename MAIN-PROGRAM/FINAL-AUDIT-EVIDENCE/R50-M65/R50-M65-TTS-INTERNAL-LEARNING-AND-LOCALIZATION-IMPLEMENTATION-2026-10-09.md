# KV30 R50-M65 — TTS Localization, Internal Learning Lifecycle, and Native Model Readiness

Date: 2026-10-09
Baseline: R50-M64 archive, reconciled in-place; Master Control v26 remains untouched and immutable; MD27 remains the current working governance linkage.

## Changes implemented

1. **Localized user messages:** TTS status message keys are provided in all 23 governed UI languages (`en` plus 22 Indian languages): language not available yet, temporary service outage, external service unavailable/internal attempt, and generation failure. The API returns governed `messageKey` values and the client resolves them through the selected UI locale. The TTS route does not contain a user-facing English sentence.
2. **Actual local voice coverage:** eSpeak fallback is attempted only when the installed eSpeak voice inventory confirms the requested language. A missing voice no longer silently generates unrelated-language audio. Unsupported registered languages return `language_tts_model_unavailable`; unknown registry codes return `unsupported_language`; neither silently falls back to English audio.
3. **Provider language gating:** the optional Sarvam adapter checks its configured verified language coverage before sending a request. Unsupported languages do not generate a provider request. External routing remains optional and governed by the existing service gates.
4. **Internal neural model lifecycle:** added `backend/src/services/ai-tts-model-lifecycle.js` with local-only dataset validation, consent and rights gates, corpus size/duration minimums, SHA-256 checks, candidate staging, offline trainer invocation, required ONNX + sidecar artifact checks, real Piper inference smoke test, evaluation gate, versioned promotion, Master Admin authority and rollback.
5. **Learning governance:** `ai-learning-loop-v30.json` now explicitly binds TTS candidate learning to local-only training, rights/consent/privacy controls, evaluation, Master Admin approval, versioned release, rollback, and no automatic production promotion. Existing generic AI learning continues to stage candidates and does not autonomously apply weights.
6. **Production runtime integration:** the TTS runtime checks the lifecycle's promoted model pointer before static per-language model configuration. A promoted model therefore becomes eligible for local inference only after governed promotion.

## Verification results

- Governed regression: **PASS**
  - Website: 514/514 PASS (211 test files)
  - Backend: 87/87 PASS (21 test files)
  - Mobile: 25/25 PASS (23 test files)
  - Desktop Electron: 3/3 PASS (2 test files)
- Static audit: 348 JavaScript syntax checks PASS; 292 JSON files parse; 322 active JavaScript import files checked; 0 unresolved active relative imports.
- Focused TTS/lifecycle tests: 12/12 PASS, including all-23-language message-key coverage, local voice inventory enforcement, rights/consent rejection, corpus gates, and Master Admin promotion/rollback controls.
- `00_KV30_MASTER_PROJECT_CONTROL.md` was not modified.

## Actual neural training status — not misrepresented

The source-level training lifecycle is implemented, but a production neural model was **not trained or promoted** in this environment. Actual checks found:

- `piper`: unavailable
- `piper_train`: unavailable
- Python `piper`, `piper_train`, `TTS`, `transformers`: unavailable
- No `.onnx` neural voice model or corresponding model config was present in the supplied baseline archive.
- No governed, consented, rights-confirmed production training corpus for the 23 languages was present.

The trainer is intentionally fail-closed: it does not download a model or package, upload corpus data, invent model weights, mark training successful without an ONNX model + sidecar, or promote without a successful local Piper inference smoke test and explicit Master Admin approval. The configured trainer command/argument contract and real approved speech corpus must be supplied in the offline deployment environment before the first genuine training run. This is a real dependency, not a reason to claim neural TTS acceptance prematurely.

## Release classification

- Localized UX and source-level TTS learning/model lifecycle: **PASS**.
- Current eSpeak local synthesis: only languages confirmed by the installed voice inventory; non-neural.
- All-23-language offline neural synthesis and production model learning: **OPEN / BLOCKED by absent trainer, model assets and approved corpus**.
- External service is not required for the architecture; however, without trained local models, external independence for unsupported languages is not yet achieved.
