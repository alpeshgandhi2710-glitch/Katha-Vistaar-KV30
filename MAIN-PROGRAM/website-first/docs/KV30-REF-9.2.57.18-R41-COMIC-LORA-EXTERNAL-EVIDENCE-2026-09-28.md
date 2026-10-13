# Katha Vistaar v30 — R41 Comic LoRA External Integration Evidence
Date: 2026-09-28

## Authority / preservation
- Current working authority: `website-first/docs/MD27_CURRENT_CONTINUATION_2026-09-28.md`.
- Canonical Master Control v26 remains immutable and was not edited.
- Existing `external-gate-configuration-profile-v30.json` was preserved byte-for-byte; new Comic LoRA gates are in the dedicated `external-capability-gates-v30.json` plane.
- Existing 100 canonical primary gates / 103 governed records remain unchanged. The new Comic LoRA capability plane is separately reported as 4 capability gates: 1 service gate + 3 boundary gates.

## Why a separate service was created
Comic LoRA character-lock has a different service contract from generic external AI: it submits a ComfyUI-compatible workflow containing an explicit LoRA loader, tracks a provider job, and retrieves provider output metadata. Therefore it uses a dedicated `comic_lora` service and does not reuse or overwrite the existing `external_ai` gate configuration.

ComfyUI's official API exposes workflow submission through `/prompt` and job/result retrieval through history endpoints; its built-in `LoraLoader` node applies a LoRA to the model/CLIP pipeline. urlComfyUI workflow API examplehttps://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/websockets_api_example.py urlComfyUI LoraLoader documentationhttps://github.com/Comfy-Org/docs/blob/main/built-in-nodes/LoraLoader.mdx

## New governed external plane
- Service: `comic_lora`
- Provider contract: ComfyUI-compatible HTTP workflow service.
- Primary gate: `service_gate_comic_lora`.
- Extra gate 1: `gate_comic_lora_inbound` — external input boundary.
- Extra gate 2: `gate_comic_lora_rights` — character/reference/data rights and consent boundary.
- Extra gate 3: `gate_comic_lora_outbound` — external output boundary.
- External layer: OFF by default.
- Internal layer: always ON.
- Authority: Master Admin controls the external service switch.
- External failure/OFF: internal Character AI + Comic AI visual continuity fallback remains available.

## Adapter implementation
`website-first/services/comic-lora-provider-adapter.js` implements:
- provider health call;
- ComfyUI-compatible `/prompt` submission;
- prompt/job ID handling;
- history retrieval;
- bounded polling;
- output metadata extraction;
- provider output URL construction;
- workflow validation requiring an accepted LoRA node and exact LoRA binding.

`website-first/services/comic-lora-service.js` implements the governed service flow:
1. canonical two-layer service switch check;
2. inbound firewall gate;
3. rights/data approval gate;
4. LoRA workflow validation;
5. primary external service submission;
6. outbound firewall gate;
7. internal fallback on OFF, denial, provider failure, or invalid external execution.

## Configuration
- `website-first/config/comic-lora-external-service-v30.json`
- `website-first/config/external-capability-gates-v30.json`
- `website-first/config/ai-capability-assurance-v30.json`
- Existing service-manager now loads the dedicated capability service contract without modifying the canonical service registry file.

Required deployment configuration is environment-backed only:
- `KV_COMIC_LORA_PROVIDER`
- `KV_COMIC_LORA_ENDPOINT`
- `KV_COMIC_LORA_API_KEY` (or an approved authenticated gateway credential)
- `KV_COMIC_LORA_LICENSE_APPROVED=true`
- `KV_COMIC_LORA_DATA_POLICY_APPROVED=true`

No secret or provider credential is packaged.

## Verification evidence
### Targeted Comic LoRA integration
**3/3 PASS**
- dedicated service gate + three boundary gates registered and fail-closed;
- Master Admin switch + health gate + external submission + output retrieval path;
- external provider failure and service OFF both return internal fallback.

### Existing external-service regression subset
**14/14 PASS**
- existing two-switch matrix remains PASS;
- existing firewall coverage remains PASS;
- existing service fallback behavior remains PASS;
- new Comic LoRA service tests PASS.

### Live provider boundary
No live third-party ComfyUI provider was configured/executed in this source-package verification. Therefore this record does **not** claim a live provider transaction. The source-side external integration is implemented and tested against a controlled local provider contract stub; live provider commissioning remains deployment evidence.

## Release classification
- `INTERNAL_VERIFIED`: PASS for the new source/configuration/adapter/fallback implementation.
- `PASS-EXTERNAL`: the capability genuinely requires an external provider for live acceptance; source-side gate/adapter/fallback acceptance is complete, while live provider health/inference remains deployment evidence.
- `PASS-ASSET`: production LoRA weights are intentionally not bundled; the external/Master-Admin-supplied approved LoRA asset remains a required deployment input for actual character-lock generation.

## Fresh post-change regression
- Website: **420/420 PASS**, 166 test files, 0 failed.
- Backend: **80/80 PASS**, 0 failed.
- Node syntax: **PASS**.
- JSON validation: **PASS**.
- Server smoke: **PASS**; `comic_lora` is visible as OFF/fallback when no provider is configured.
- Packaged ZIP re-verification: **Comic LoRA 3/3 PASS; Website 420/420 PASS; Backend 80/80 PASS**.
- ZIP integrity: **PASS**; final ZIP SHA-256 is supplied separately in `KV30-R41-COMIC-LORA-SHA256.txt` to avoid circular self-hashing.

## Candidate status
R41 is a **governed candidate release**, not a final production certification. The source-side implementation and regression evidence are complete; live third-party provider commissioning and approved production LoRA weights remain deployment evidence.
