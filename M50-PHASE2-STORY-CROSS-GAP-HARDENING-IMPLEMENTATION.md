# KV30 R50-M50 — Phase 2 Story Cross-Gap Hardening

Release: `REF-9.2.57.18-R50-M50-PHASE2-STORY-CROSS-GAP-HARDENING-2026-10-07`
Parent: `REF-9.2.57.18-R50-M49-PHASE2-STORY-CHARACTER-MATRIX-CONTINUITY-HARDENING-2026-10-07`

## Corrections
1. Story readiness now fails closed when normalized Character Matrix or structured Continuity is malformed.
2. Added governed Story translation-draft persistence/listing through `/api/studio/story/:id/translation-drafts`.
3. Translation drafts use the canonical 23-language Story content contract; invalid language is rejected.
4. Translation-draft writes reuse Story Studio revision, autosave clearing, collaboration authorization, persistence and audit.
5. Story Studio web UI now exposes governed Continuity save and Translation Draft save controls.
6. Generic Story GET routing was corrected so `translation-drafts` is not shadowed by the generic Story GET route.

## Verification
- Website: 474/474 PASS
- Backend: 80/80 PASS
- Mobile: 19/19 PASS
- Desktop: 2/2 PASS
- M50 focused: 2/2 PASS
- M49 focused: 3/3 PASS
- M48 focused: 2/2 PASS

Phase 2 Story remains OPEN; no global closure claim.
