# Katha Vistaar KV30 — M76 source + CI package

This repository package contains the `MAIN-PROGRAM/` source tree and the GitHub Actions workflow under `.github/workflows/`.

## Run CI
After the repository contents are committed, open **Actions → KV30 Platform Build Verification → Run workflow**. The workflow runs Android builds/emulator smoke, iOS build/Simulator smoke on macOS, and desktop checks. A ZIP integrity check is not a substitute for a successful Actions run.

## Security boundary
Confidential Master Admin, production secrets, backup-recovery and emergency-recovery folders are intentionally excluded from this GitHub source package. Do not commit live secrets, signing keys, `.env` files, or local build outputs. `.gitignore` is a safety net, not a substitute for reviewing files before commit.

## Repository layout
- `MAIN-PROGRAM/` — program source
- `.github/workflows/kv30-platform-build.yml` — native and desktop CI workflow
- `00_KV30_MASTER_PROJECT_CONTROL.md` — preserved project control document
- `M49`–`M58` implementation notes — continuation records
