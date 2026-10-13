# Katha Vistaar v30 --- R40 Real-Source Reconciliation & Fresh Acceptance Continuation

**Reference:** REF-9.2.57.18-R40-REAL-SOURCE-RECONCILIATION\
**Status:** SOURCE RECONCILIATION + FRESH REGRESSION ACCEPTANCE
COMPLETE\
**Master Control:** `MD27 current governed continuation
immutable/canonical and is not edited.

## 1. Working baseline

The working tree is:

`historical R40 working-tree path (provenance only; not a runtime/build dependency)`

The tree contains the recovered broad KV30 source, the preserved
original `app.js`, the R40 corrected application source, reconciled
localization governance/tests, backend/shared sources, and preserved
historical/pre-reconciliation copies.

Current working-tree file count: **1,883**.

## 2. R40 application reconciliation

Original `website-first/public/app.js` was preserved separately:

-   Size: 789,412 bytes
-   SHA-256:
    `8c24e25fbddac3cdbd0a6035ef7a9df723db9057afee46b8d272f4c052656108`

R40 v8 reference:

-   Size: 797,889 bytes
-   SHA-256:
    `30335f6027316f2e1d62aa8333df507e0ce2aa842a3e09884ed3fcebda93526f`

Patch:

-   `R40-v8-over-original-app.patch`
-   SHA-256:
    `719bac3a36aa05f6ef42b9a29138f8cdac2a175f76a4ebddd138228123d865f7`

The patch was applied to the preserved original source and reconstructed
the exact R40 v8 reference byte-for-byte.

A subsequent genuine runtime catalog defect was found during execution:
12 English catalog entries incorrectly invoked `x(...)` before the
runtime catalog function was safely available. Those entries were
corrected to semantic English catalog values. A governed
`trainingUnavailable` fallback was also added.

Current working `app.js`:

-   Size: 798,000 bytes
-   SHA-256:
    `5ce38455133d137eba07330bd30805ecff0fec1f6a26ad02e7d5860a37d81cac`

This SHA is intentionally different from the pre-runtime-fix R40 v8 SHA
because the catalog/runtime corrections are genuine source changes.

## 3. Server-source governance

The exact 30W authentication/registration server artifact remains
preserved separately:

-   `server.js (6).txt` / `server.js (7).txt`
-   SHA-256:
    `d89421941cb717342eee99211b08532f3d0dbf266061344b645e8de0193cf5c3`

It was not substituted into the complete application tree because it
lacks the canonical full-tree persistence-map architecture required by
the recovered KV30 application.

The complete working-tree server remains the recovered full application
server:

-   `website-first/src/server.js`
-   Size: 437,649 bytes
-   SHA-256:
    `44c2890f0c0cc7505d3152f17280f42acfbbc8831c273f25057361a685d05ea0`

No silent merge or overwrite of these two distinct server artifacts is
authorized by this record.

## 4. Localization contract reconciliation

The current binding runtime contract is:

-   Supported non-English missing/empty/whitespace/placeholder `[key]`
    values fall back to the authoritative English catalog.
-   Unsupported/unavailable locales fall back to English.
-   Literal `[key]` must not surface when an English catalog value
    exists.
-   Future languages are registry-driven; there is no hardcoded
    23-language ceiling.
-   UI strings/messages remain localization-key driven rather than
    hardcoded.
-   English fallback acceptance does **not** constitute native/reviewed
    translation completion.

Governed configuration and stale tests were reconciled to this contract,
with `.pre-r40-fallback-reconciliation` backups preserved.

## 5. Fresh acceptance evidence

### Backend

Three independent fresh regression runs:

-   Run 1: **78/78 PASS**
-   Run 2: **78/78 PASS**
-   Run 3: **78/78 PASS**

### Website

Three independent fresh regression runs:

-   Run 1: **409/409 PASS**
-   Run 2: **409/409 PASS**
-   Run 3 retry after timeout: **409/409 PASS**
-   Files: 161
-   Concurrency: 8
-   Failed files: 0

The timed-out first attempt of Website Run 3 is not counted as a PASS.

### Static gates

-   JavaScript syntax: **258 files checked, 0 failures**
-   JSON parse: **364 files checked, 0 failures**

## 6. Targeted evidence

The following reconciled/targeted gates passed:

-   English catalog root-cause: **77/77 PASS**
-   Localization fallback contract: **PASS**
-   R25 strict localization runtime: **PASS**
-   R26 language architecture/extensibility: **PASS**
-   R26 locale bundle governance: **PASS**
-   R37 static localization: **3/3 PASS**
-   R38 UI fallback boundary: **PASS**
-   R38 final UI contract: **PASS**
-   R38 ad assets/two-layer switch governance: **PASS**
-   R6 governed literal conversion: **PASS**
-   Help language test: **3/3 PASS**
-   Phase-2 stitch regression: **8/8 PASS**

## 7. Explicit non-closure items

The following are **not** certified closed by this record:

1.  Native/reviewed 23-language UI translation completion.
2.  Runtime/model behavioral evidence for all Reader/Writer AI language
    behavior across all required formats/environments.
3.  Final production release ZIP and release SHA certification.

These remain separate governed gates.

## 8. Integrity rule

No historical PASS, invented SHA, substituted server, missing source
module, or fabricated runtime evidence is used as current acceptance
evidence in this continuation.

`MD27 current governed continuation
immutable/canonical. This document is an append-only continuation record
and does not modify MD27 current governed authority.
