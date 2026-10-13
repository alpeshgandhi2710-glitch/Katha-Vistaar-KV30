const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const p = path.join(root, 'config', 'aarohan-production-evidence-audit-v30.json');
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
if (d.dependency !== 'none') throw new Error('AAROHAN dependency introduced');
if (d.status !== 'REFERENCE_EVIDENCE_REJECTED_AS_PRODUCTION_CERTIFICATION_PENDING_REPRODUCTION') throw new Error('unsafe evidence status');
if (d.direct_reproduction.master_verifier_reported_checks !== '9/12') throw new Error('unexpected reproduction result');
if (d.direct_reproduction.failed_steps.join(',') !== 'STEP-01-CR,STEP-02-ED,STEP-03-LLM') throw new Error('failed-step set changed');
for (const k of Object.keys(d.tested_claims)) { if (!['NOT_ACCEPTED','FAILED_REPRODUCTION'].includes(d.tested_claims[k].status)) throw new Error('unverified claim promoted: '+k); }
console.log('REF-8.3.155.9.2.16 AAROHAN production evidence audit PASS — claims remain evidence-gated; dependency=none');
