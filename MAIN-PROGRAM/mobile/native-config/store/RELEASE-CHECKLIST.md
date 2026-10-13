# KV30 Android/iPhone Store Packaging Checklist

## Automated/source-side gates completed
- Application identity/version contract present in pubspec.yaml.
- Development and production API/secret separation is required; no live secret is bundled.
- Permission declarations and runtime approval policy are defined.
- Network/secure-storage baseline is automatic; sensitive device capabilities are runtime-approved.
- Publishing, payment, subscription, account and rights contracts remain backend-governed.

## Asset/device gates (PASS-ASSET)
- Android/iPhone physical build and signing.
- Physical microphone/camera/photo picker/notification behavior.
- Audio driver latency and waveform rendering performance.
- Store signing credentials and final store upload.
- OS-version/device matrix.
