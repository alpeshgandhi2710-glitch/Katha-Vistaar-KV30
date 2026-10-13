const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('path');
const fs=require('fs');
const server=require('../src/server');
const router=require('../../backend/src/services/ai-model-router');

test('AI ecosystem completion: planning alias resolves to canonical all-domain AI',()=>{
  const r=router.resolveSpecialistForTask('project planning');
  assert.equal(r.aiId,'all_domain_master_intelligence_ai');
});

test('AI ecosystem completion: risk memo store is governed and persistent',()=>{
  assert.ok(server.aiRiskMemos instanceof Map);
  const reg=JSON.parse(fs.readFileSync(path.join(__dirname,'../../shared/persistence-registry.json'),'utf8'));
  assert.ok(reg.maps.includes('aiRiskMemos'));
});

test('AI ecosystem evidence boundary is explicit',()=>{
  const e=JSON.parse(fs.readFileSync(path.join(__dirname,'../../shared/kv30-evidence-state-v30.json'),'utf8'));
  assert.equal(e.rule,'configuration_is_not_live_commissioning');
  assert.equal(e.current.user_testing,'FINAL_PROJECT_COMPLETION_GATE');
  assert.equal(e.current.external_provider_commissioning,'SEPARATE_EVIDENCE_GATE');
});
