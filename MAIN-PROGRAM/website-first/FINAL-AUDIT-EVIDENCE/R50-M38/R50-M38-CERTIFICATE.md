# KV30 R50-M38 — Reproducible Test & Release Hardening Certificate

Release: REF-9.2.57.18-R50-M38-REPRODUCIBLE-TEST-AND-RELEASE-HARDENING-2026-10-06
Parent: REF-9.2.57.18-R50-M37-TEST-ISOLATION-RELEASE-READINESS-2026-10-06
Master Control: v27 current baseline; v26 immutable historical predecessor.

## Root causes corrected
- The prior custom per-file parallel runner added its own child lifecycle, output-pipe and worker orchestration layer. Under repeated/resource-heavy execution this could become environment-sensitive even when the application tests themselves were clean.
- The canonical runner is now Node 22's native `node --test` runner with built-in concurrency=4 and per-test timeout=120000ms. The custom child-worker/counter/pipe orchestration is removed.
- R50-M11 Master Admin cross-platform test used fixed TCP port 8897, creating a real parallel collision risk; it now uses an ephemeral localhost port.
- A per-run temporary sandbox and governed runtime reset are retained.
- Release identity and current metadata are synchronized to R50-M38.

## Same-workspace repeated execution
- Run 1: 462/462 PASS, 0 failed, 28.82s.
- Run 2: 462/462 PASS, 0 failed, 31.07s.
- Run 3: 462/462 PASS, 0 failed, 31.03s.

## Fresh whole governed-package copies
- Fresh package D: 462/462 PASS, 0 failed, 31.87s.
- Fresh package E: 462/462 PASS, 0 failed, 32.55s.
- Fresh package F: 462/462 PASS, 0 failed, 26.53s.

Historical/environment-sensitive timeout executions are not counted as PASS.

## Other verification
- Mobile source suite: 19/19 PASS.
- Server syntax: PASS.
- Test-runner syntax: PASS.
- R50-M11 corrected test syntax: PASS.
- JSON parse audit: 171 executable/package JSON files parsed successfully in current MAIN-PROGRAM scope.
- Anonymous and authenticated Help/ticket flows remain covered by current Website/Mobile suites.
- Android Dev/Prod identity and reproducible iOS host-bootstrap source contracts remain covered.
- Native Node runner full suite: 462/462 PASS; 188 test files.

## Packaging rule
Runtime SQLite databases/WAL/SHM, communications outbox, generated runtime media and other test/runtime state are excluded from delivery. Live secrets are excluded; only governed templates are delivered.

## External launch boundary
Native Android/iOS compilation/signing, physical-device tests, production infrastructure, live payment settlement, live SMTP/SMS, neural model execution and store submission remain external gates and are not fabricated as executed PASS.
