# KV30 R50-M36 — Remaining Launch Gates

## Closed in source/runtime audit
- Website/API/backend source regression
- Mobile source parity and native host contracts
- Android Dev/Prod application identity separation
- Reproducible iOS Flutter host bootstrap contract
- Desktop Electron source checks
- Localization runtime contract and hardcoded-literal audit
- Release package runtime-artifact exclusion
- Authenticated and anonymous Help/ticket lifecycle

## External execution gates still requiring their real environment
1. Android: run CI/on-host Flutter build for development and production variants; install on supported device matrix; verify permissions, FM recording, camera/photo picker, notifications and network.
2. iOS: run `scripts/bootstrap-ios-host.sh`, `flutter build ios --no-codesign`, then signing/archive on macOS; verify permissions and FM recording on physical devices.
3. Production server: run `scripts/production-readiness-check.js` against the actual production readiness endpoint with production environment enabled and required secrets configured.
4. Payment: execute real provider sandbox/production settlement, webhook/recovery/refund flows using approved production GST/SAC configuration.
5. Internal communications: execute real internal SMTP/SMS delivery and retry/recovery evidence with Master Admin-controlled external fallback switches.
6. AI/TTS: install the selected governed neural model/runtime and run the required 23-language behavioral evidence; eSpeak remains development fallback and is not neural production TTS.
7. Browser media/runtime: run actual WebGPU/WebCodecs/WASM probes on supported production browsers/devices where those capabilities are required.
8. Store: perform final signing, privacy declarations, permission declarations, store upload and review acceptance.

These gates are not source defects; they require environments/credentials/devices that are not present in the current audit runtime.
