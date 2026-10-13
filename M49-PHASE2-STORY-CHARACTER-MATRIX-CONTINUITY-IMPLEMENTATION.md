# KV30 R50-M49 — Phase 2 Story Character Matrix + Continuity Hardening

Release: `REF-9.2.57.18-R50-M49-PHASE2-STORY-CHARACTER-MATRIX-CONTINUITY-HARDENING-2026-10-07`
Parent: `REF-9.2.57.18-R50-M48-PHASE2-STORY-PUBLISH-GATE-HARDENING-2026-10-06`

## Source-level corrections
- Character Matrix now has stable IDs, bounded relationship types, normalized character endpoints, provenance and deterministic validation.
- Continuity facts/threads now have stable IDs, type/status, provenance and explicit character/scene/beat references.
- Unknown/deleted character, scene or beat references fail closed.
- Character deletion is dependency-safe and rejects active Matrix/Continuity references with deterministic 409 at the HTTP boundary.
- Matrix/Continuity mutations reuse Story Studio save/revision/autosave persistence, collaboration authorization and audit.
- Existing canonical `canonicalFacts` / `openThreads` text compatibility is preserved alongside structured `facts` / `threads`.
- M48 ZIP is preserved byte-for-byte under `BACKUP-RECOVERY/BASELINE-M48-EXACT/`.

## Deterministic focused tests
- Matrix normalization + unknown-character rejection
- Continuity stable IDs/provenance + reference validation
- Dependency-safe character deletion

## Changed source SHA-256
9e7c63a0cab92aedec510d0a2ab0d2e7dd9aa2c49c2e947bc54f4da75359b3fb  MAIN-PROGRAM/backend/src/services/story-studio.js
260d9908c778834dac09500dc3b1e96c7e102732d9d5694e5dcdcd575d4773cd  MAIN-PROGRAM/website-first/src/server.js
540fad6808859e45c71b3f9b96ca863cf8d06c82748d46d48228224bdd49a715  MAIN-PROGRAM/website-first/public/app.js
5e752b11c7982cee17c2207455d5312fb5f7ac5835c43713294a9386f9a37cd7  MAIN-PROGRAM/website-first/tests/r50-m49-phase2-story-character-matrix-continuity.test.js
fe8af232a760e42343d8d621b3ee8553e084d6caf04dd3c6092277548fab3590  MAIN-PROGRAM/website-first/tests/r50-m48-phase2-story-publish-gate.test.js
102fb44b66b8be3be9c134c9bf2feffbe6864241d52288a67a638a7c65f9a509  MAIN-PROGRAM/website-first/config/version.json
b2769c85149059d794a1b6e7bf86c5c874d6b20220081d4311fee7e46b9229bc  MAIN-PROGRAM/website-first/config/release-registry-v30.json
d07615210314ee2d9a9a1b4ee530071c800b465bd374dd6a6859366b94b772f6  MAIN-PROGRAM/website-first/RELEASE-MANIFEST-v30.json

Phase 2 Story remains open; this cycle specifically advances G-2-STORY-03 and does not claim global Story closure.
