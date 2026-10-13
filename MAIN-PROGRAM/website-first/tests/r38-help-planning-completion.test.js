const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const server=require('../src/server');
const router=require('../../backend/src/services/ai-model-router');

test('R38 common help FAQ is governed and persisted',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/common-help-faq-v30.json'),'utf8'));
 assert.ok(cfg.items.length>=5);
 assert.ok(server.helpFaqs instanceof Map);
 assert.equal(server.persistenceMaps.helpFaqs,undefined);
});

test('R38 planning AI is canonical alias, not an extra AI identity',()=>{
 const r=router.resolveSpecialistForTask('project planning');
 assert.equal(r.aiId,'all_domain_master_intelligence_ai');
 const wiring=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/ai-ecosystem-wiring-v30.json'),'utf8'));
 assert.deepEqual(wiring.functionalAliases.planning_ai,['ai_orchestrator','all_domain_master_intelligence_ai']);
 assert.equal(wiring.planningIdentityRule.includes('not an additional managed AI identity'),true);
});

test('R38 planning and help routes exist in authoritative server source',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');
 assert.match(src,/\/api\/help\/faq/);
 assert.match(src,/\/api\/ai\/planning-plan/);
 assert.match(src,/planningAlias:'planning_ai'/);
});
