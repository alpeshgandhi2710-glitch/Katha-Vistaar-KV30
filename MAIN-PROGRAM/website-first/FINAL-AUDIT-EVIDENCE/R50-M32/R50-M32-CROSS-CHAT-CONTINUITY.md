# R50-M32 Cross-Chat Continuity

Current release `REF-9.2.57.18-R50-M32-WEBSITE-DEEP-RECONCILIATION-2026-10-05` supersedes M31 for the Website deep-reconciliation scope.

Actual defect: transactional SMS queue rows were not reaching the internal SMS gateway; the queue dispatcher still used the email service boundary. Fixed with explicit channel-aware internal message routing and internal-first delivery.

Coverage: Website 455/455 PASS x3; Backend 80/80; Mobile 16/16; focused 9/9.

Current Master Control baseline: v27. v26 remains immutable historical predecessor.
