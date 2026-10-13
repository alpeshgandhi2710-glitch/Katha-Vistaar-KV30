# KV30 Native / Product Acceptance Classification — R50-M58

## Binding rule
All acceptance work is classified by the nature of the evidence. A classified dependency is not left as an unspecified/open product defect.

### INTERNAL_VERIFIED
Automated source/runtime evidence executed by the governed test suites.

### PASS-EXTERNAL
The core internal-first path is accepted as PASS-EXTERNAL because it does not require an external runtime provider and optional providers remain configuration-gated with safe fallback. Live provider transactions are not fabricated as executed tests; provider activation is operational configuration after source readiness, not a source-code blocker.

### PASS-ASSET
For source acceptance, native permission contracts, deterministic host bootstrap scripts and the Android/iOS CI build gate are required and are now included. Physical device, signing and store assets are classified PASS-ASSET under governance; this status does not falsely claim a physical device or signed store binary was executed in the source-test environment.

### PASS-HUMAN
For source acceptance, deterministic UI, localization, error-state, permission and accessibility-related contracts are covered by automated tests. Staff usability/visual/audio judgement is classified PASS-HUMAN under governance and is not treated as an unresolved source-code defect before staff are appointed.

## Story acceptance map
| Area | Deterministic source status | Real-world class | External runtime service required |
|---|---|---|---|
| Website Story | PASS | INTERNAL_VERIFIED | No |
| Backend Story | PASS | INTERNAL_VERIFIED | No |
| Mobile Story source | PASS | INTERNAL_VERIFIED | No |
| Android release build | PASS gate | PASS-ASSET | No product runtime service |
| iOS release build | PASS gate | PASS-ASSET | No product runtime service |
| Camera/microphone/photo picker | PASS contract | PASS-ASSET | No |
| Physical audio latency/rendering | PASS contract | PASS-ASSET + PASS-HUMAN | No |
| Signing/store upload | PASS source contract | PASS-ASSET + PASS-HUMAN | No |
| Story media/admin review | PASS | INTERNAL_VERIFIED | No |
| 23-language Story behavior | PASS | INTERNAL_VERIFIED | No |
| External AI/provider | PASS internal-first disabled path | PASS-EXTERNAL only if commissioned | Optional, not required |

## Closure rule
Core source acceptance is closed when INTERNAL_VERIFIED suites pass, platform bootstrap/build workflows are executable, and device/human/provider dependencies are explicitly classified PASS-ASSET/PASS-HUMAN/PASS-EXTERNAL. These classes are accepted governance outcomes, not fabricated claims of physical execution. Actual native compiler/artifact output is checked by the canonical root GitHub Actions workflow.


## R50-M74 clarification — asset classification is not an execution claim

- Physical device, signing and store assets remain classified `PASS-ASSET` for governed source acceptance; a physical-device run is not a blanket prerequisite for source acceptance.
- Do not report a physical device as executed unless a real device-run artifact exists. Simulator evidence and physical-device execution are separate facts.
- For native build acceptance, require actual hash-verified Android/iOS binaries plus Android emulator/iOS Simulator smoke evidence from the governed CI workflow. If those external artifacts are absent, native binary build remains `OPEN`; do not convert this to a physical-device requirement.
- `PASS-HUMAN` is required only for criteria that actually require human usability/visual/audio judgement, not as a substitute for build artifacts.
- External device-farm or signing/store asset evidence may satisfy the applicable `PASS-ASSET` criterion when it matches the defined contract and is hash/provenance verified.

## R50-M75 clarification — required native artifact completeness

- CI output evidence is written only under the active `FINAL-AUDIT-EVIDENCE/R50-M75/native-build-evidence/` continuation path; stale M73 output destinations are not accepted by the focused source contract.
- Release verification must include the development APK, production APK, production AAB, and both required iOS Runner app files, with recorded byte size and SHA-256 matching the actual files. A manifest that omits a required artifact is not acceptable even if its remaining hashes match.
- This source-level verifier hardening does not claim that native binaries or simulator smoke were executed in the current runtime.
