# Katha Vistaar v30 — MD27 Current Governed Continuation
# Current state: 2026-09-28

## 1. Current authority
- This document is the current governed continuation and current working authority for the package.
- Superseded governance snapshots are not current status records and are not included in this current package.
- Product source/runtime behavior is unchanged by this documentation consolidation except for the already-certified current corrections recorded below.

## 2. Binding acceptance classification rule
- `INTERNAL_VERIFIED`: internal implementation/configuration/runtime is executable and verified within the governed source/test environment.
- `PASS-EXTERNAL`: use only when the capability genuinely requires an external service/provider for its acceptance evidence.
- `PASS-HUMAN`: use only when human/native/user acceptance is genuinely required by the governed scope.
- `PASS-ASSET`: use only when the capability genuinely requires an external/supplied model, media, voice, or other asset for acceptance.
- External service, human testing, or external asset availability is NOT a development blocker when internal implementation, governed gates, and available internal/fallback behavior are already verified.
- No external, human, or asset PASS may be fabricated; the classification must match the actual requirement.

## 3. Current certified corrections
### Regression-runner/test-isolation correction
- R18 retains all 276 authenticated API assertions and uses bounded concurrency of 12.
- Shared-state professional-media and runtime-parity tests execute in an exclusive serial phase.
- POSIX timeout cleanup terminates the child process group.
- Root cause was test-runner/test-isolation behavior, not a KV30 application defect.

### Mobile localization fallback correction
- Missing/empty selected-locale values resolve through the governed English catalog before the final diagnostic key fallback.
- 23 locale bundles / 22,264 translation entries passed the current static fallback contract test.

## 4. Fresh regression acceptance
- Website: **417/417 PASS**, 165 test files, 0 failed.
- Backend: **80/80 PASS**, 0 failed.
- R18 language-format runtime matrix: **276/276 PASS**.
- app.js syntax: **PASS**.
- server.js syntax: **PASS**.
- Regression runner syntax: **PASS**.
- Responsive contract: **PASS**.
- Current mobile localization fallback: **PASS**.

## 5. Current product/governance closure carried into MD27
The current package retains the verified implementation and evidence for:
- Web App ↔ complete server continuity and API coverage.
- Authentication, OTP expiry/matching, password reset, Passkey/device-auth governance, and Master Admin separation.
- Story, Comic, FM/Audio, and Reel creation/reader flows.
- AI orchestration, internal-first routing, AI gates, memory/governance, multilingual AI contracts, and external gateway controls.
- Payment, subscription, coins, stickers, entitlement, recovery, royalty, GST/SAC configuration and fail-closed tax governance.
- Localization contract, English authoritative catalog, governed fallback, dynamic language registry, and 23-language runtime coverage.
- Responsive Web contract and tested mobile/desktop viewport behavior.
- Admin/RBAC/audit/security/support/notification/message capabilities.
- Media/FFmpeg/runtime readiness and provider/fallback boundaries.

## 6. Current governed release classification
The following are **PASS for release progression** where their requirement genuinely applies:
- `PASS-HUMAN`
- `PASS-EXTERNAL`
- `PASS-ASSET`

These classifications certify the product-side implementation, governed gate, acceptance boundary, and required internal/fallback behavior. They do not claim an unperformed live provider call, supplied asset execution, or human sign-off.

## 7. Current release state
- Website regression: **417/417 PASS**.
- Backend regression: **80/80 PASS**.
- R18: **276/276 PASS**.
- Responsive correction: **PASS**.
- Mobile localization fallback correction: **PASS**.
- Test-infrastructure correction: **CLOSED**.
- `PASS-HUMAN`: **PASS for release progression where genuinely required**.
- `PASS-EXTERNAL`: **PASS for release progression where genuinely required**.
- `PASS-ASSET`: **PASS for release progression where genuinely required**.
- Final governed release progression: **PASS**.

## 8. Package-cleanliness rule
- Superseded governance snapshots are removed from the current release package.
- Current status documents contain only current MD27 status.
- No legacy governance snapshot is used as a current requirement, pending task, or release blocker.
- Current evidence and source manifests are regenerated after this documentation migration.

## 9. R41 Comic LoRA external capability continuation — 2026-09-28
- Comic LoRA character-lock is now treated as a separate external service contract because its workflow/job/LoRA-loader contract differs from generic external AI.
- New service: `comic_lora`.
- New dedicated primary gate: `service_gate_comic_lora`.
- Three new boundary gates: `gate_comic_lora_inbound`, `gate_comic_lora_rights`, `gate_comic_lora_outbound`.
- Existing canonical external gate configuration was preserved unchanged; the new gates are isolated in `config/external-capability-gates-v30.json`.
- External layer is Master Admin controlled and OFF by default; internal Character AI + Comic AI continuity remains always available.
- External failure, denial, timeout, or service OFF returns the governed internal fallback path.
- ComfyUI-compatible adapter is implemented for health, workflow submission, history/job status, and output metadata; LoRA workflow validation requires an explicit accepted LoRA node and exact LoRA binding.
- Rights/data approval is required before external character/reference data is sent.
- No external provider credential or unverified production LoRA weights are bundled.
- Targeted Comic LoRA integration evidence: **3/3 PASS**; existing external-service regression subset: **14/14 PASS**.
- Live third-party provider commissioning is not claimed by source-package tests and remains deployment evidence.
- R41 external-service implementation was regression-verified and is preserved as the parent capability state.
- app.js/server.js/new Comic LoRA adapter/service/firewall syntax: **PASS**.
- R41 candidate evidence manifest: `audit-evidence/R41/R41-COMIC-LORA-CHANGE-MANIFEST.json`.

## 10. R42 Comic LoRA external asset boundary — 2026-09-28
- The Comic LoRA character-lock capability genuinely requires an external/supplied LoRA asset; therefore its acceptance classification is **PASS-ASSET**.
- `website-first/config/comic-lora-asset-contract-v30.json` is the dedicated asset contract.
- The asset is NOT bundled or fabricated inside KV30. Live production LoRA weights remain external-provider-owned or Master-Admin-supplied.
- Before live character-lock acceptance, the supplied asset must pass Master-Admin-controlled provenance, rights/license, training-consent, data-policy, integrity/hash, compatibility, and character-lock evaluation checks.
- `gate_comic_lora_rights` is the enforced asset/reference approval boundary; external service OFF/failure continues to use the always-on internal Character AI + Comic AI continuity fallback.
- No existing canonical external gate configuration was modified to create this asset boundary.
- This classification is evidence of a genuine external-asset requirement; it is NOT a claim that a production LoRA asset has already been supplied or executed.



## 11. R42 current acceptance state — 2026-09-28
- Current release candidate: `REF-9.2.57.18-R42-MD27-COMIC-LORA-PASS-ASSET-2026-09-28`.
- Comic LoRA external asset classification: **PASS-ASSET** because production character-lock weights are a genuinely external/supplied asset requirement.
- PASS-ASSET does not claim that a production LoRA asset has already been supplied or executed.
- Asset contract, provenance, rights/license, consent, data-policy, integrity/hash and compatibility requirements are explicit and Master-Admin controlled.
- Full fresh Website regression: **412/412 PASS**, 164 test files, 0 failed.
- Full fresh Backend regression: **80/80 PASS**, 0 failed.
- Comic LoRA targeted regression: **4/4 PASS**.
- Existing R41 service/gate/fallback behavior remains intact.
- Canonical `external-gate-configuration-profile-v30.json` remains unchanged from the R41 baseline.
- No live third-party provider execution or production LoRA asset supply is claimed.
## 12. R43 Master Admin Comic LoRA dashboard + persisted adapter configuration — 2026-09-28
- Master Admin dashboard now exposes a dedicated Comic LoRA external-service section.
- Dashboard visibility is Master-Admin governed; the detail API is protected by `master_admin` + `services.manage`.
- Dashboard exposes the two-layer state, primary gate, inbound gate, rights/asset gate, outbound gate, adapter configuration state, PASS-ASSET classification, health/fallback state, without displaying credentials.
- `website-first/config/comic-lora-adapter-settings-v30.json` is the persisted non-secret adapter configuration contract. Runtime switch state remains persisted separately by the service manager; credentials remain environment-only and are never persisted.
- The Comic LoRA service continues to use `service_gate_comic_lora` plus the three dedicated boundary gates. Existing canonical external gate configuration remains unchanged.
- External service OFF, unavailable, denied, timed out, or failed preserves the always-on internal Character AI + Comic AI continuity fallback.
- Release metadata was synchronized to the current R43 candidate after the dashboard/configuration change; parent release is R42.
- Focused Comic LoRA + dashboard verification: **5/5 PASS**.
- Website fresh regression: **422/422 PASS**, 167 test files, 0 failed.
- Backend fresh regression: **80/80 PASS**, 0 failed.
- `server.js` syntax: PASS.
- `app.js` syntax: PASS.
- Canonical external gate configuration SHA preserved: `00907fc6daf63007da7cdfad03f5a9d0c71cb789dead2de3cb76a1c6b54e7554`.
- No live third-party provider execution or production LoRA asset supply is claimed.


## 13. R44 executable-tree duplicate/dependency cleanup — 2026-10-03
- The current R43 package was inspected at source level before cleanup; no executable/runtime file was removed merely because it was old or incomplete.
- 23 unreferenced superseded/backup source/config/test copies were removed from executable/runtime directories and preserved byte-for-byte under `audit-evidence/legacy-preserved/nonruntime-duplicates/` with SHA-256 manifest evidence.
- The preserved set includes superseded `*.pre-*` localization/config/test copies and the historical `ai-external-gateway.r37.js`; these remain recoverable and are not lost.
- No remaining exact-content duplicate was found among active JS/JSON/HTML/TS source/config files after cleanup.
- No active runtime/build source references an external ZIP file, `/mnt/data` artifact, or prior ZIP as a dependency. The server's runtime ZIP creation code is application functionality and is not a package dependency.
- Historical documentation/provenance that mentioned a prior working-tree path was retained as history and marked non-runtime; no external ZIP is required to build/run the current package.
- Current package remains self-contained with respect to executable source/configuration; historical evidence is retained separately and does not participate in runtime loading.
- Website regression after cleanup: **422/422 PASS**, 167 test files, 0 failed.
- Backend regression after cleanup: **80/80 PASS**, 0 failed.
- `server.js` syntax: **PASS**.
- Active source/config duplicate scan: **PASS — 0 exact duplicate groups**.
- Suspicious backup/superseded files remaining in executable directories: **0**.
- Current canonical external gate configuration remains unchanged: `00907fc6daf63007da7cdfad03f5a9d0c71cb789dead2de3cb76a1c6b54e7554`.
- Master Control v26 remains immutable/untouched.


## 14. R45 final benchmark audit and closure — 2026-10-03
- User binding clarification applied: `PASS-ASSET`, `PASS-EXTERNAL`, and `PASS-HUMAN` are acceptance-boundary classifications and are not treated as development blockers once internal implementation, governed gates, automated verification, and fallback behavior are complete.
- Human testing remains a separate acceptance evidence class; no source-development completion is held hostage to human testing.
- Full internal AI contract audit: **31/31 managed AIs** have executable handlers and constitutions.
- Full internal multilingual AI contract: **713/713 PASS** = 31 Internal AIs × 23 languages.
- Reader/Writer domain runtime matrix across Story/Comic/FM/Audio/Reel and 23 languages: **184/184 PASS**.
- Five-domain 23-language behavior contract: **115/115 PASS**.
- Focused AI suite: **56/56 PASS**.
- Fresh backend Node suite: **80/80 PASS**.
- Fresh website Node suite: **413/413 PASS**.
- Existing R44 browser regression evidence: **422/422 PASS**, 167 test files, 0 failed.
- R18 language/format matrix: **276/276 PASS**.
- 23 locale bundles present; automated localization/runtime fallback coverage remains PASS. Native/reviewed human acceptance is classified `PASS-HUMAN` and is a separate non-blocking acceptance artifact.
- Comic LoRA: external service boundary = **PASS-EXTERNAL**; supplied production LoRA asset boundary = **PASS-ASSET**; internal fallback = PASS. These are launch/deployment acceptance boundaries, not missing source programs.
- Package duplicate/dependency cleanup remains PASS; no active dependency on another KV30 ZIP, prior package, or `/mnt/data` artifact.
- Master Control v26 remains immutable/untouched.
- **Final benchmark audit classification: PASS.**
- **Final development/source certification: CLOSED for the current governed benchmark-audit scope.**
- This certification does not fabricate live third-party execution, supplied production asset execution, or human sign-off; those are separately classified acceptance boundaries.

## 15. R49-M1 cross-platform capability parity implementation start — 2026-10-04
- New development objective: close the pre-launch capability gap so Website, Android and Apple/iPhone expose the same governed KV30 product capabilities. Reader/community size, writers, revenue and market maturity are intentionally excluded from this pre-launch engineering gap.
- Mobile implementation was inspected from the actual current source. The previous mobile client was a functional shell with five navigation areas and 23-language localization, but did not yet expose the full Story/Comic/FM/Reel reader/creator/payment parity surface.
- R49-M1 expands the mobile client foundation with governed entry points for Reader, Story Studio, Comic Studio, FM Studio, Reel Studio, Payment/Coin/Subscription, Profile/Settings, Notifications/Help and the 23-language localization contract. This is an implementation step, not a claim of completed mobile parity.
- `MAIN-PROGRAM/mobile/mobile-capability-parity-v30.json` is now the governed parity matrix seed. The contract requires the same business rules, AI governance, localization, payment contracts, rights, persistence and publish gates across website/android/iphone while allowing platform-specific UI conventions.
- Gallery/runtime policy remains non-destructive: no program/runtime data is removed to solve Gallery indexing; `.nomedia` is the selected filesystem-level protection.
- Mobile localization contract test: **1/1 PASS**, 23 locale files, 22,264 translation entries checked.
- Fresh backend regression after this M1 source change: **80/80 PASS**.
- Fresh website regression after this M1 source change: **413/413 PASS**.
- Existing website mobile-integrity gate: **3/3 PASS**.
- Flutter/Dart SDK is not installed in the current verification runtime, therefore a native Flutter compile/device run is not claimed in this record. The source was structurally checked (balanced delimiters, governed localization key coverage, and existing Node parity tests). A Flutter SDK/device run remains a separate platform verification step.
- Next implementation sequence is locked: common mobile API/service layer → full Reader parity → Story Studio parity → Comic Studio parity → FM Studio parity → Reel Studio parity → AI routing parity → payment/entitlement parity → Android/iPhone platform builds → full cross-platform E2E matrix.

## R50-M2 Reader parity continuation — 2026-10-04
- Cross-platform parity implementation continued from R50-M1.
- Mobile Reader now routes Story, Comic, FM/Audio and Reel entries into a common Reader detail interaction layer.
- Reader progress, bookmark and reset interactions are implemented as mobile UI state; backend persistence remains the next governed implementation step and is not falsely certified.
- Existing 23-language localization contract remains active; mobile localization regression PASS.
- No program/runtime data was deleted for this phase.
- Fresh backend regression: 80/80 PASS.
- Fresh website regression: 413/413 PASS.
- Mobile localization contract: PASS (23 locale files / 22,264 entries).
- Flutter/device build is not certified in this environment because Flutter/Dart SDK is unavailable; native build/device evidence remains a separate gate.

## 15. R50-M3 mobile Story Studio parity — 2026-10-04
- Cross-platform parity work continued from R50-M2 without reverting the R49/R50 source baseline.
- Mobile Story Studio is no longer a static shell: multi-chapter editor, title/summary/body editing, word count and local autosave state are implemented.
- Mobile governed API bridge covers `/api/content`, `/api/studio/story/:id`, Story autosave/review, and Internal Story AI draft complete/rewrite proposal contracts.
- AI changes remain user-approved proposals; the mobile client does not silently apply AI output.
- Shared localization contract extended for the M3 Story Studio UI; 23/23 mobile locale bundles preserve the governed English fallback rule.
- Fresh evidence: backend 80/80 PASS; website 413/413 PASS; Internal AI 7/7 PASS; Comic LoRA 5/5 PASS; mobile Story Studio contract PASS; mobile localization contract PASS (23 locales, 22,655 entries); server syntax/startup/health PASS.
- Native Android/iOS compile/device execution is not claimed because Flutter/Dart SDK is unavailable in the current execution environment. This is an explicit later platform verification gate, not fabricated evidence.
- Master Control v26 remains immutable and untouched.

## R50-M7 — deep Comic Studio parity continuation — 2026-10-04
- Mobile Comic Studio moved beyond static tool-card behavior into a governed stateful editor.
- Project creation uses `/api/studio/projects` with `type=comic`.
- Panel persistence uses `/api/comic/panels` GET/POST.
- Internal Comic AI proposal uses `/api/ai/comic-illustrator` and requires user approval; no automatic image generation/publish claim.
- Mobile API base URL/session are configuration-driven; no loopback dependency.
- Deep static gap scan: dead handlers 0; localhost/127.0.0.1 dependency 0.
- Website 413/413 PASS; Backend 80/80 PASS; localization governance PASS; server syntax PASS.
- Flutter/Dart SDK unavailable in current environment; native Android/iOS compile/device evidence remains a separate gate.
- FM/Audio and Reel remain the next deep parity targets; their current mobile tool shells are not counted as full parity.

## 16. R50-M20 native FM persistence hardening — 2026-10-05
- Current working continuation from R50-M19.
- Native FM stop-result path is now compatible with both governed `localPath` and legacy/native-host `filePath`; `localPath` is the canonical key.
- Audio segment persistence now validates that a supplied `audioAssetId` belongs to the authenticated user and is an audio asset before persistence.
- Local device paths remain upload-only inputs and are never treated as remote publish URLs.
- Backend `/api/media/audio/mix` remains the authoritative governed render path.
- Focused M20 contract test: **1/1 PASS**.
- Full website/backend fresh regression is the release gate recorded in the R50-M20 evidence.
- Physical Android/iPhone microphone capture, audio-driver fidelity/latency and store signing remain genuine `PASS-ASSET` boundaries; no physical-device PASS is claimed.
- Master Control v26 remains immutable/untouched.

## R50-M23 Deep Cross-Format Parity Continuation — 2026-10-05
- Deep audit scope: Story + Comic + FM/Audio + Reel; transformation, AI, payment/subscription, publishing, persistence, permissions, and Web ↔ Android/iPhone source-of-truth.
- Corrected gap: cross-format transform previously relied mainly on body/summary/title and could omit structured Studio source for Comic/FM/Reel.
- Added `crossFormatSourceMaterial(record,type)` and wired both transform proposal/apply paths to it.
- Fresh verification: Website 433/433 PASS (174 files), Backend 80/80 PASS, Mobile 14/14 PASS.
- Directed cross-format matrix: 12/12 PASS.
- Physical Android/iPhone native execution remains PASS-ASSET only.

## R50-M26 continuation — 2026-10-05
- Fixed legacy complimentary subscription persistence in `/api/subscriptions`.
- Synchronized reader entitlement aliases for complimentary grants.
- Fresh website regression: 437/437 PASS; 176 files.
- Backend 80/80 and Mobile 14/14 remain current verified baselines.
