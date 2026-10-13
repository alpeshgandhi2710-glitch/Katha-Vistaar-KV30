# R50-M36 — Native Environment Source Completion

Release: REF-9.2.57.18-R50-M36-NATIVE-ENVIRONMENT-SOURCE-COMPLETION-2026-10-06
Parent: REF-9.2.57.18-R50-M35-INDEPENDENT-FULL-PROJECT-RELEASE-READINESS-2026-10-06
Master Control: v27 current baseline; v26 immutable historical predecessor.

## Corrections
- Android now has distinct governed development and production application IDs: `com.kathavistaar.kv30.dev` and `com.kathavistaar.kv30`.
- Android launcher label is environment-aware through the product flavor resource.
- iOS now has a reproducible source bootstrap contract (`mobile/scripts/bootstrap-ios-host.sh`) that generates the Flutter Runner/Xcode host from the installed Flutter SDK, preserves the governed AppDelegate/Info.plist, and documents distinct development/production bundle IDs.
- CI now requests both Android development and production debug builds and bootstraps the iOS host before the no-code-sign build.
- Runtime `website-first/data/` was removed from the delivery staging before package creation.
- Current localization governance now distinguishes the still-open three-run certification from the already-closed hardcoded-literal audit.

## Verification
- Mobile source suite: 19/19 PASS.
- Website current direct source suite: 452/452 PASS; M35 authoritative release runner remains 461/461 PASS.
- M35 independent monolithic Website run: 461/461 PASS.
- Backend: 80/80 PASS.
- JS syntax: PASS.
- Runtime data staging: excluded.
- Native binary compilation/signing: not executed in this environment.
