# KV30 R50-M61 Deep Source / Program / Registry / Evidence Hardening

Release: REF-9.2.57.18-R50-M61-PHASE2-ROOT-CAUSE-AND-NATIVE-PERMISSION-HARDENING-2026-10-08

## Fresh deep audit
- Website regression: 514/514 PASS across 211 website test files.
- Backend regression: 80/80 PASS.
- Mobile regression: 22/22 PASS.
- Desktop Electron regression: 3/3 PASS.
- Production JavaScript syntax: 340/340 PASS.
- Shipped JSON parsing: 287/287 PASS.
- Local JavaScript module import linkage: PASS.
- Canonical cross-platform source-of-truth wiring: PASS.

## Root-cause corrections
1. Mobile `KvAdminApi` referenced an undefined `body` during stale-state retry. It now accepts/preserves the request body and deterministically refreshes canonical state before retry.
2. Mobile authenticated Help mutations carried the state-sync contract but did not refresh/retry on `stale_canonical_state`. The authenticated path now follows the same canonical refresh/retry rule; public Help calls remain unauthenticated.
3. Current release registry metadata was reconciled to the fresh 514/514 website run.
4. Release-manifest evidence paths were reconciled to files that actually exist in the delivered package.
5. Current M61 deep source-truth evidence was added because the registry previously referenced a missing evidence file.

## Duplicate policy
Exact duplicates were rechecked. Runtime/source duplicates are removed only when byte-identical, unused, and outside governed recovery/provenance boundaries. Backup, Master Admin, Emergency Recovery, and historical evidence copies are retained where their boundary/provenance role is distinct.

## Runtime boundary
Test-generated SQLite/WAL/SHM, TTS, export, quarantine, and other transient runtime artifacts are not delivery source and are excluded from the final package.

## Backup / Master Admin
BACKUP-RECOVERY, EMERGENCY-RECOVERY, and MASTER-ADMIN-CONFIDENTIAL remain separate governed recovery/authority boundaries. Current M61 verification is additive; historical recovery evidence is preserved.

Final governed package: 1184 files / 1363 ZIP entries; package verifier PASS; no embedded ZIP or runtime artifacts.
