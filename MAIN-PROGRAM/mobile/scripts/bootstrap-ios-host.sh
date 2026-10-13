#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v flutter >/dev/null 2>&1 || { echo "flutter_required" >&2; exit 2; }
cd "$ROOT"
CUSTOM_APP_DELEGATE="$(mktemp)"
CUSTOM_INFO="$(mktemp)"
trap 'rm -f "$CUSTOM_APP_DELEGATE" "$CUSTOM_INFO"' EXIT
if [[ -f ios/Runner/AppDelegate.swift ]]; then cp ios/Runner/AppDelegate.swift "$CUSTOM_APP_DELEGATE"; fi
if [[ -f ios/Runner/Info.plist ]]; then cp ios/Runner/Info.plist "$CUSTOM_INFO"; fi
flutter create --platforms=ios --org com.kathavistaar .
if [[ -s "$CUSTOM_APP_DELEGATE" ]]; then cp "$CUSTOM_APP_DELEGATE" ios/Runner/AppDelegate.swift; fi
if [[ -s "$CUSTOM_INFO" ]]; then cp "$CUSTOM_INFO" ios/Runner/Info.plist; fi
test -s ios/Runner.xcodeproj/project.pbxproj
test -s ios/Runner/AppDelegate.swift
test -s ios/Runner/Info.plist
echo "IOS_HOST_BOOTSTRAP_PASS: Xcode project and governed host sources present"
