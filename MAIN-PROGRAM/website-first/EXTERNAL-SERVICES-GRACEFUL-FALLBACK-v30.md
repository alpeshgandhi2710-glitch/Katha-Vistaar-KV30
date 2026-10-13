# Katha Vistaar v30 — External Service Two-Layer / Graceful-Fallback Policy

## Architecture

Every optional external service has **two layers**:

1. **Internal program layer — ALWAYS ON**
   - owned by Katha Vistaar itself;
   - provides the normal fallback/core behavior;
   - does not require an external provider;
   - must remain usable when the provider is absent, disabled, unreachable, licensed incorrectly, or temporarily failing.

2. **External provider layer — OFF by default**
   - optional provider adapter;
   - controlled by **Master Admin only**;
   - may be enabled only after credentials, endpoint, health check, and applicable licence/data-policy gates pass;
   - if disabled or failing, traffic returns to the internal layer.

The application must never assume that an external provider exists.

## Provider onboarding contract

For the generic HTTP adapter, configure:

- `KV_<SERVICE>_PROVIDER` — provider name;
- `KV_<SERVICE>_API_KEY` — secret credential;
- `KV_<SERVICE>_ENDPOINT` — provider HTTPS API endpoint;
- optional `KV_<SERVICE>_HEALTH_URL` — health endpoint; default is `<ENDPOINT>/health`;
- optional licence/data-policy gates where the service registry requires them.

The generic provider contract uses `GET /health` for readiness and `POST` JSON for the service operation. Providers with a different API shape should use a dedicated adapter rather than weakening the core fallback boundary.

## Master Admin rule

Only `master_admin` can enable or disable the external layer.

Enabling performs a health/readiness check first. If it fails, the service stays OFF and the internal layer remains active.

Disabling an external service immediately returns the capability to the internal layer.

## Safe behavior when no provider exists

No external provider is **not an application error**.

Examples:

| Service | External function | Internal behavior |
|---|---|---|
| Email | real email delivery | local/test outbox + in-app status |
| SMS | real SMS/OTP delivery | local/test outbox or available verified channel |
| Payment | live gateway | internal test ledger |
| Ads | ad network | internal promotional inventory / no network ads |
| External AI | provider AI | bounded internal AI |
| STT | speech-to-text provider | text input |
| TTS | speech synthesis provider | browser/internal text output |
| Object storage | production bucket | local limited storage |
| CDN | CDN | origin delivery |
| Malware scanner | external scanner | local scan + quarantine |
| Push/WhatsApp | external notification | in-app/email fallback where configured |

## OTP distinction

When no real email/SMS provider is configured, the program must **not claim that an email/SMS was delivered**.

For development/test mode (`ALLOW_LOCAL_DEMO=true`):

- OTP is stored in the test outbox;
- the UI identifies the delivery mode as a test/internal fallback;
- the test OTP may be exposed for local testing;
- `/api/dev/mailbox` exposes the development outbox.

In production mode, the test OTP must not be exposed. A real provider must be connected and health-checked for actual delivery.

## Production distinction

The following remain explicitly **NOT production-grade merely because the architecture exists**:

- HLS generation
- AES-128 key management
- protected HLS key endpoint
- segment authorization
- FFmpeg transcoding pipeline
- Widevine/FairPlay DRM
- production CDN/object storage
- production database persistence
- real payment provider adapters
- real SMS/email provider delivery

Each must receive its own production deployment, security, operational, load and failure testing before being marked production-ready.

## Fail-safe requirement

Provider timeouts, API errors, malformed responses, authentication failures, unavailable endpoints and provider-side outages must be caught at the adapter boundary. They must never crash or corrupt the Katha Vistaar core application.
