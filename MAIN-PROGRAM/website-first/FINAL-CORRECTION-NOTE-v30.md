# Katha Vistaar v30 — KV30-P2-30P Root-Cause Correction Note

KV30-P2-30P is the direct successor to the user-supplied and SHA-256-verified the supplied verified baseline.

## Visual correction
The supplied Phase-1 mobile reference was treated as the visual source of truth for this release. The prior generic web-dashboard styling was refined into a compact, premium mobile application language: white surfaces, restrained purple primary actions, smaller semantic icons, compact cards, stronger typography hierarchy, and a persistent five-item mobile navigation bar.

## Functional corrections
- Added working mobile Home/Search/Library/Write/Profile navigation.
- Added a working header language selector.
- Made Profile Works/Posts/Updates tabs functional.
- Removed duplicate Notifications and Message Box entries from the mobile menu.
- Removed duplicate notification/message ad strips.
- Preserved the approved Login rule: username OR registered email OR registered mobile + password; OTP is used when verification is required.
- Preserved separate registration, OTP and Forgot Password reset stages.
- Preserved WebAuthn challenge/verification for device authentication.

## Backup/security corrections
- Backup utilities now create per-file SHA-256 integrity metadata.
- Admin Emergency Backup is isolated from the normal application and copies only approved non-secret metadata.
- Master Recovery private key is explicitly external/owner-controlled and is never bundled or hard-coded.
- Active release references and documentation were normalized to KV30-P2-30P.

No test was weakened or disabled to make the release pass. Production provider/device gates remain explicitly documented.
