# KV30 iOS Environment Contract

The repository carries the governed iOS native host source. The Xcode Runner project is generated deterministically with `scripts/bootstrap-ios-host.sh` because the audit environment has no Xcode/Flutter toolchain and cannot safely manufacture a signed Xcode project.

Environment identity:
- Development bundle ID: `com.kathavistaar.kv30.dev`
- Production bundle ID: `com.kathavistaar.kv30`
- API endpoint is supplied through Flutter `--dart-define=KV_API_BASE_URL=...`; no endpoint or secret is hardcoded.

The generated Xcode project must use the matching bundle identifier for the selected build environment. Physical signing/device acceptance remains an external gate.
