# KV30 Local Native Build Runner — R50-M61

Run from MAIN-PROGRAM:
- `bash mobile/scripts/run-local-native-build.sh preflight`
- `bash mobile/scripts/run-local-native-build.sh android`
- `bash mobile/scripts/run-local-native-build.sh ios`
- `bash mobile/scripts/run-local-native-build.sh all`

The runner writes logs and artifacts locally under `.native-build-artifacts/`. It does not upload artifacts, publish releases, or enable production signing. Android compilation requires Flutter/Dart and Android SDK; iOS compilation requires macOS/Xcode and Flutter. Preflight success is not binary acceptance. A real build and real artifact hash verification are required.
