# KV30 Governed Regression Gate

Run `npm test` from `MAIN-PROGRAM/` for the authoritative release regression.

The gate runs the Website, Backend, Mobile source-contract and Desktop suites. It reads each suite's actual TAP summary and discovered test-file count; it does not use hard-coded totals. Only after every suite exits successfully and reports `tests == pass` with `fail == 0` does it update current M61 release registries, current evidence summaries, Backup-Recovery and Master Admin verification records, and SHA-256 manifests.

A failing or unparseable suite stops the gate before the current release evidence is certified. Historical release evidence remains unchanged. `npm run test:website-only` is a convenience for isolated Website development and is not the full release gate.

The gate validates source-level contracts; it does not substitute for Flutter/Dart compilation, physical Android/iPhone execution, signing/store review, human accessibility review or live external-provider acceptance. Those are tracked as distinct acceptance classes rather than being falsely marked PASS by source tests.
