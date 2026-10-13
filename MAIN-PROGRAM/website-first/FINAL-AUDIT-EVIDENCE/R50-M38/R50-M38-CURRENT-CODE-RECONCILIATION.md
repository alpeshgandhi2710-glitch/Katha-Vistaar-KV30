# R50-M38 Current Code Reconciliation

1. `scripts/run-all-tests.js` now delegates the full Website suite to Node 22's native `node --test` runner with governed concurrency and per-test timeout. The former custom per-file child-worker orchestration, pipe lifecycle and manual counters were removed.
2. The runner still creates a per-run temporary sandbox and resets known runtime/test state before execution.
3. `tests/r50-m11-master-admin-cross-platform.test.js` no longer binds fixed port 8897; it uses an ephemeral localhost port.
4. `src/server.js`, `config/version.json`, `config/release-registry-v30.json`, and `RELEASE-MANIFEST-v30.json` are synchronized to R50-M38.
5. Three repeated same-workspace runs and three fresh whole-package runs all completed 462/462 with zero failed files.
6. M37 runtime-data exclusion and Help/localization corrections remain preserved.
7. The delivered package itself is verified for forbidden runtime artifacts and required-file presence before release.
