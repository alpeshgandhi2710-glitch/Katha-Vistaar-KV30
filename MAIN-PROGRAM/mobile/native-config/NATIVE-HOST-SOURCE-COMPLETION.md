# KV30 Native Host Source Completion — R50-M61

## Governed native channels
- `kv30/native_permissions`
- `kv30/native_fm`

## Source-level root-cause fixes
- iOS pause/resume state is tracked in the host implementation; code does not reference a nonexistent `AVAudioRecorder.isPaused` property.
- Android recorder startup verifies `AudioRecord.STATE_INITIALIZED` and catches start/read failures.
- Android stop order stops the recorder before joining the capture thread, then releases resources and refuses to emit a file if the worker did not stop cleanly.
- Pause/resume reject invalid state transitions instead of reporting success while no recording is active.
- Native hosts do not falsely claim that a local recording file is a rendered mix. Canonical audio mixing/rendering remains server-authoritative; local recordings are upload inputs only.
- Recorded files remain app-private and are uploaded to the backend before persistence/publication. A local file path is never a publish URL.

## Build infrastructure
- Canonical CI workflow: repository-root `.github/workflows/kv30-platform-build.yml`.
- Android bootstrap preserves governed native source while generating missing Gradle wrapper/scaffolding.
- iOS bootstrap preserves governed AppDelegate/Info.plist while generating the Xcode Runner project.
- CI runs `flutter pub get`, `flutter analyze`, Android development APK, production APK/AAB, iOS unsigned Runner.app output checks and uploads verification artifacts.
- The CI artifact names explicitly say `native-build-verification-only`; the build-only `.invalid` API endpoint is never represented as a deployable production endpoint.

## Acceptance
- INTERNAL_VERIFIED: source tests, static JS/JSON linkage, Swift syntax parse, Kotlin syntax diagnostic scan and native build-contract tests.
- PASS-ASSET: accepted under KV30 governance for source completion; device/signing/store execution is not fabricated by local source tests.
- PASS-HUMAN: accepted under KV30 governance for source completion; staff usability review is not a source-code blocker.
- PASS-EXTERNAL: accepted for the internal-first core path; optional providers remain gated with safe fallback.
- Actual Android/iOS binary compilation is executed by the canonical CI workflow. Local source evidence does not misrepresent that CI build as already executed.
