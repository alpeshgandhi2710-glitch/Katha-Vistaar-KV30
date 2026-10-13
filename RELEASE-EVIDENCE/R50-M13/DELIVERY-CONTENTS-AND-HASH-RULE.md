# KV30 R50-M13 Delivery Evidence

All certificate/evidence/hash/manifest artifacts for this update are contained inside this ZIP under `RELEASE-EVIDENCE/R50-M13/`.

The ZIP itself is the sole user delivery artifact for this update.

Important checksum rule: a SHA-256 checksum of the ZIP cannot be stored inside the same ZIP without creating a circular hash. Therefore this folder contains the SHA-256 of the canonical delivery manifest instead of a self-referential ZIP checksum. The final ZIP checksum may be calculated by the receiving system after download.
