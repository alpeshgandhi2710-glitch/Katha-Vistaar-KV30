# KV30 R50-M61 Root-Cause and Native Permission Evidence

Release: REF-9.2.57.18-R50-M61-PHASE2-ROOT-CAUSE-AND-NATIVE-PERMISSION-HARDENING-2026-10-08
Parent: REF-9.2.57.18-R50-M60-PHASE2-RELEASE-IDENTITY-CACHE-BACKUP-HARDENING-2026-10-08

## Root cause fixed
Two release-identity tests still accepted only R50-M40 through R50-M59. The active source was R50-M60. The tests were updated to accept the current R50-M61 continuation while preserving the release identity equality checks.

## Native bug fixed
Android `kv30/native_permissions` previously called `requestPermissions(...)` and immediately returned `false`, even when the user had not answered the OS permission dialog. This caused an incorrect permission result to the Flutter caller.

The host now stores the pending `MethodChannel.Result`, returns the actual result from `onRequestPermissionsResult`, and rejects overlapping permission requests while one is pending.

iOS already used asynchronous permission callbacks and required no equivalent change.

## Verification
- Website full source suite: 495/495 PASS.
- Mobile source contract suite: 22/22 PASS.
- Focused R50-M40/R50-M41 root-cause tests: 4/4 PASS.
- Node syntax: server.js, app.js and affected JS tests PASS.
- Android host source contract explicitly checks pending permission callback handling.
- Master Control v26 unchanged.

## Final runtime smoke
- `GET /` -> HTTP 200
- `GET /api/health` -> HTTP 200
- `GET /api/languages` -> HTTP 200
- `GET /api/features` -> HTTP 200
- `GET /api/ai/status` -> HTTP 200
- server.js Node syntax: PASS
- app.js Node syntax: PASS
