#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOBILE="$ROOT/mobile"
ARTIFACT_ROOT="${KV30_NATIVE_ARTIFACT_ROOT:-$ROOT/.native-build-artifacts}"
mkdir -p "$ARTIFACT_ROOT/logs"
LOG="$ARTIFACT_ROOT/logs/native-build-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG") 2>&1
MODE="${1:-preflight}"
case "$MODE" in preflight|android|ios|all) ;; *) echo "Usage: $0 [preflight|android|ios|all]"; exit 64;; esac
echo "KV30 LOCAL-ONLY NATIVE BUILD"
echo "mode=$MODE"
echo "utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "external_upload=DISABLED"
echo "production_signing=DISABLED"
echo "os=$(uname -s)"
for cmd in node flutter dart java gradle adb sdkmanager xcodebuild; do
  if command -v "$cmd" >/dev/null 2>&1; then echo "$cmd=$(command -v "$cmd")"; else echo "$cmd=MISSING"; fi
done
echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-${ANDROID_HOME:-NOT_SET}}"
[[ -x "$MOBILE/android/gradlew" ]] && echo "android_gradle_wrapper=PRESENT" || echo "android_gradle_wrapper=MISSING"
[[ -s "$MOBILE/ios/Runner.xcodeproj/project.pbxproj" ]] && echo "ios_project=PRESENT" || echo "ios_project=MISSING"
if [[ "$MODE" == preflight ]]; then exit 0; fi
if [[ "$MODE" == ios && "$(uname -s)" != Darwin ]]; then echo "BLOCKER: iOS compilation requires macOS/Xcode; this host is not Darwin."; exit 22; fi
command -v flutter >/dev/null 2>&1 || { echo "BLOCKER: Flutter SDK unavailable; compilation did not start."; exit 20; }
if [[ "$MODE" == android || "$MODE" == all ]]; then
  [[ -n "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}" ]] || { echo "BLOCKER: Android SDK path not configured."; exit 21; }
  bash "$MOBILE/scripts/bootstrap-android-host.sh"
  cd "$MOBILE"
  flutter pub get
  flutter analyze --no-pub
  flutter build apk --release
  flutter build appbundle --release
  cd "$ROOT"
  node scripts/verify-native-build-output.js android --artifact-dir "$ARTIFACT_ROOT/android"
fi
if [[ "$MODE" == ios || "$MODE" == all ]]; then
  [[ "$(uname -s)" == Darwin ]] || { echo "BLOCKER: iOS compilation requires macOS/Xcode; this host is not Darwin."; exit 22; }
  command -v xcodebuild >/dev/null 2>&1 || { echo "BLOCKER: Xcode unavailable."; exit 23; }
  bash "$MOBILE/scripts/bootstrap-ios-host.sh"
  cd "$MOBILE"
  flutter pub get
  flutter analyze --no-pub
  flutter build ios --release --no-codesign
  cd "$ROOT"
  node scripts/verify-native-build-output.js ios --artifact-dir "$ARTIFACT_ROOT/ios"
fi
echo "BUILD_COMMANDS_FINISHED mode=$MODE"
