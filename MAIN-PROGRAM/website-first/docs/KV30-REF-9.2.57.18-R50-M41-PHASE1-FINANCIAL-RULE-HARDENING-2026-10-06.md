# Katha Vistaar v30 — R50-M41 Phase-1 Financial Rule Hardening

Release: `REF-9.2.57.18-R50-M41-PHASE1-FINANCIAL-RULE-HARDENING-2026-10-06`
Parent baseline: `REF-9.2.57.18-R50-M40-SOURCE-RECONCILIATION-AND-RUNTIME-HARDENING-2026-10-06`
Current working governance: `MD27`
Current Master Control baseline: `v27`; historical v26 remains immutable.

## Root causes found in M40
1. `RELEASE-MANIFEST-v30.json` still contained stale legacy `releaseRef` / `releaseLabel` aliases pointing to M39/M37 even though the canonical release fields were M40.
2. Sticker royalty economic-basis paths used `stickerCoinRate || 1` and `coinValueInr=1`, silently inventing an INR business value when the configured rate was absent.

## Corrections implemented
- Synchronized all active release identity fields to M41 and parented M41 explicitly to M40.
- Synchronized `website-first/src/server.js` `BUILD_REF` to M41.
- Removed the silent coin-value `1` fallback from `core/royalty-engine.js`.
- Coin-based sticker economic-basis calculation now fails closed with `coin_value_required` when no configured coin value is supplied.
- Direct sticker gifts now fail closed with `sticker_coin_rate_not_configured` when the managed sticker coin rate is missing/invalid.
- Cash sticker economic basis remains explicit and does not require a coin conversion rate.
- Added `tests/r50-m41-phase1-financial-rule-hardening.test.js` covering release identity and financial fallback behavior.

## Verification
- M41 focused hardening: 3/3 PASS.
- Existing Phase-1 financial suite: 17/17 PASS.
- Website: 466/466 PASS across 190 test files.
- Backend: 80/80 PASS.
- Mobile: 19/19 PASS.
- Desktop Electron: 2/2 PASS.
- `server.js` syntax: PASS.
- `app.js` syntax: PASS.
- Runtime-generated `website-first/data` removed from active delivery after testing.
- No secrets added.
- M40 remains the exact parent baseline and recovery/no-loss boundary.

## Rule impact
No new monetization formula or tax rate was introduced. The change is fail-closed hardening: missing configuration no longer becomes an invented business value.

## Next executable stopping point
`PHASE 2 — STORY PRODUCT WORK`, subject to the governed Master Control exit/approval gates.
