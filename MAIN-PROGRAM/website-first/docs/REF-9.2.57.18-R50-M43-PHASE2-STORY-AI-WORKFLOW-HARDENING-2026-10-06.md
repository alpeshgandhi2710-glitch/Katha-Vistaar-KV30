# Katha Vistaar v30 — R50-M43 Phase-2 Story AI Workflow Hardening

Release: `REF-9.2.57.18-R50-M43-PHASE2-STORY-AI-WORKFLOW-HARDENING-2026-10-06`
Parent: `REF-9.2.57.18-R50-M42-PHASE2-STORY-PRODUCT-HARDENING-2026-10-06`
Status: `UPDATED_CANDIDATE — PHASE 2 STORY REMAINS OPEN`

## Root-cause findings
1. The existing `/api/ai/smart-assist` Story workflow returned an approved proposal but had no governed apply/persistence boundary. The proposal therefore could not be committed through the Story domain with provenance and revision semantics.
2. `/api/ai/creator-generate/apply` persisted generated Story content, but its `studioProject` was taken directly from model structured output rather than normalized through the governed Story Studio schema.
3. M42 release metadata/tests required synchronization when M43 became the active continuation; stale M42 identity assertions were corrected rather than suppressed.

## Implemented corrections
- Added authenticated `POST /api/ai/smart-assist/apply` for Story only.
- Requires explicit creator approval and validates the governed 23-language registry.
- Supports creating a new Story draft or applying an approved AI-assisted proposal to an owned Story.
- Uses `storyStudio.normalizeProject()` and existing Story revision/persistence/audit boundaries.
- Records `derivedFrom.mode=ai-assisted`, `aiId=story_ai`, `externalUsed=false`, and `provenanceVersion=KV30-AI-PROVENANCE-1`.
- Creator-generated Story apply now normalizes its Story Studio project and records the same governed provenance version.
- External AI remains disabled on these core paths.
- No lifecycle-authoritative Map was added.

## Verification
- Focused M43 Story AI workflow: **3/3 PASS**.
- Website: **469/469 PASS across 191 test files**.
- Backend: **80/80 PASS**.
- Mobile: **19/19 PASS**.
- Desktop Electron: **2/2 PASS**.
- `server.js` syntax: PASS.
- Story Studio service syntax: PASS.
- Runtime-generated `website-first/data` removed from active delivery after tests.
- Phase-2 Story remains open; this cycle closes only the identified AI-assisted/generated persistence/provenance gap.

## No new business rule
No new monetization, tax, royalty, entitlement, language-count, or Master-Admin authority rule was introduced. The patch implements existing internal-first AI, creator-approval, Story persistence, provenance and audit requirements.
