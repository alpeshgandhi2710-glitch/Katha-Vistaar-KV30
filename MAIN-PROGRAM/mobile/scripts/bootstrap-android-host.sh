#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v flutter >/dev/null 2>&1 || { echo "flutter_required" >&2; exit 2; }
cd "$ROOT"
# Preserve governed native source while asking Flutter to generate missing host infrastructure
# (Gradle wrapper, wrapper JAR/properties and any required default scaffolding).
backup="$(mktemp -d)"
cleanup() { rm -rf "$backup"; }
trap cleanup EXIT
for rel in \
  android/app/build.gradle \
  android/app/src/main/AndroidManifest.xml \
  android/app/src/main/kotlin/com/kathavistaar/kv30/MainActivity.kt \
  android/app/src/main/res/values/styles.xml \
  android/build.gradle \
  android/settings.gradle \
  android/local.properties.template; do
  if [[ -f "$rel" ]]; then mkdir -p "$backup/$(dirname "$rel")"; cp "$rel" "$backup/$rel"; fi
done
flutter create --platforms=android --org com.kathavistaar .
while IFS= read -r -d '' f; do
  rel="${f#"$backup/"}"
  mkdir -p "$(dirname "$rel")"
  cp "$f" "$rel"
done < <(find "$backup" -type f -print0)
test -x android/gradlew || chmod +x android/gradlew
test -s android/gradle/wrapper/gradle-wrapper.jar
test -s android/gradle/wrapper/gradle-wrapper.properties
test -s android/app/src/main/AndroidManifest.xml
test -s android/app/src/main/kotlin/com/kathavistaar/kv30/MainActivity.kt
echo "ANDROID_HOST_BOOTSTRAP_PASS: governed source preserved; Gradle wrapper present"
