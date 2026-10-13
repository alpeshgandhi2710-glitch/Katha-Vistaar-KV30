# KV30 R50-M56 — Phase 2 Story Mobile Persistence / Publishing Hardening

Release: `REF-9.2.57.18-R50-M56-PHASE2-STORY-MOBILE-PERSISTENCE-PUBLISHING-HARDENING-2026-10-07`
Parent: `REF-9.2.57.18-R50-M55-PHASE2-STORY-REVIEW-PUBLISHING-CONTINUATION-HARDENING-2026-10-07`

## Root causes found and corrected

1. Mobile Story API helper methods introduced during M54/M55 referenced an undefined `draft` variable instead of receiving the active `KvStoryDraft` instance. This was a source-level runtime/compile defect hidden by the JavaScript source-contract runner.
2. Mobile `KvStoryApi.save()` sent `chapters` inside the project, but the governed Story service persists `acts`, `scenes`, `characters`, `beats`, `characterMatrix`, and `continuity`. This could silently discard chapter structure on server save.
3. Mobile publication could call the governed publish endpoint while the local Story draft was dirty, allowing stale server content to be submitted. Publication now saves a missing or dirty draft before calling the publish endpoint.
4. Release identity metadata was reconciled to M56 after source changes: server `BUILD_REF`, version, release registry and release manifest are synchronized.
5. Existing M55 mobile publish/read tests were reconciled to the corrected draft-scoped API contract; no governed behavior was removed.

## Implementation

- `MAIN-PROGRAM/mobile/lib/story_studio.dart`
  - all Story continuation API methods now receive `KvStoryDraft d` explicitly;
  - chapter data is deterministically mapped to governed acts/scenes during save;
  - publish saves when the draft is missing or dirty;
  - existing review, checklist, translation, Matrix, Continuity, review-finding and Story AI routes remain governed.
- `MAIN-PROGRAM/mobile/tests/r50-m56-phase2-story-mobile-parity-hardening.test.js`
  - focused source contract for API signatures, no undefined API `draft` references, chapter mapping and dirty-publish persistence.
- `MAIN-PROGRAM/website-first/tests/r50-m56-phase2-story-mobile-parity-hardening.test.js`
  - cross-surface contract verification.
- `MAIN-PROGRAM/website-first/tests/r50-m55-phase2-story-publishing-review-continuation.test.js`
  - updated to the current M56 draft-scoped mobile contract while preserving the M55 review/checklist/23-language checks.
- `MAIN-PROGRAM/mobile/tests/studio-publish-parity.test.js`
  - updated to assert the corrected `api.publish(draft, ...)` contract.

## Verification

- Website: **489/489 PASS**
- Backend: **80/80 PASS**
- Mobile: **20/20 PASS**
- Desktop Electron: **2/2 PASS**
- M56 focused: **1/1 PASS**
- M55 continuation focused: **3/3 PASS**
- Server syntax: PASS
- App syntax: PASS
- Story Studio service syntax: PASS
- JSON metadata parse: PASS
- Release identity: PASS
- Runtime artifact boundary: PASS
- Active delivery runtime data: removed before packaging; final ZIP must contain zero `MAIN-PROGRAM/website-first/data/` entries.

## Governance / scope

- Internal-first architecture unchanged.
- External AI/service governance unchanged.
- Master Admin authority unchanged.
- Monetization/GST/SAC/royalty rules unchanged.
- Master Control v26 remains immutable.
- MD27 remains current working governance.
- Phase 2 Story global closure is **NOT CLAIMED**.
- Evidence is embedded inside the final governed ZIP under `FINAL-AUDIT-EVIDENCE/R50-M56/`.
- The final ZIP SHA is delivered as a detached companion document generated from the final ZIP bytes; the ZIP does not contain a self-referential final ZIP hash.
