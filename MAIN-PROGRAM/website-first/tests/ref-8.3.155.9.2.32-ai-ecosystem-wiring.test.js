'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-ecosystem-wiring-v30.json'),'utf8'));
const capability=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-capability-contract-v30.json'),'utf8')).ais;
const profiles=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-intelligence-profiles-v30.json'),'utf8')).ais;
const constitutions=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-constitutions-v30.json'),'utf8')).roles;
const gates=JSON.parse(fs.readFileSync(path.join(ROOT,'config','internal-ai-gate-configuration-v30.json'),'utf8')).gates;
const communication=require('../../backend/src/services/ai-communication.js');
const management=require('../../backend/src/services/ai-management.js');
const inference=require('../../backend/src/services/ai-internal-inference.js');
const memory=require('../../backend/src/services/ai-memory-rag.js');
const external=require('../../backend/src/services/external-gate-firewall.js');

test('all 31 managed Internal AIs have role, handler, constitution, profile and dedicated internal gate',()=>{
 assert.equal(contract.identityCount,31);assert.equal(contract.entries.length,31);assert.equal(Object.keys(management.roles).length,31);assert.equal(Object.keys(inference.handlers).length,31);
 for(const row of contract.entries){const id=row.aiId;assert.ok(capability[id],id);assert.ok(profiles[id],id);assert.ok(constitutions[id],id);assert.ok(management.roles[id],id);assert.ok(inference.handlers[id],id);const g=gates.find(x=>x.aiId===id);assert.ok(g,id);assert.equal(row.internalGate,g.gate);assert.equal(g.mode,'internal_only');assert.equal(g.failClosed,true);assert.equal(g.masterAdminControlled,true);assert.equal(row.externalAllowed,false);}
});

test('functional AI aliases map to existing governed identities without creating a hidden 32nd AI',()=>{
 assert.deepEqual(contract.functionalAliases.master_teacher_ai,['all_domain_master_intelligence_ai','training_ai']);
 assert.deepEqual(contract.functionalAliases.report_ai,['analytics_ai']);
 assert.deepEqual(contract.functionalAliases.program_support_ai,['programmer_ai','design_ai','quality_ai','security_ai','cyber_defense_ai','media_security_ai']);
 assert.equal(contract.functionalAliases.ai_to_ai_communication_service.includes('ai_management'),true);
 for(const list of Object.values(contract.functionalAliases)) for(const id of list) assert.ok(id==='ai_management'||management.roles[id],id);
 assert.equal(Object.keys(management.roles).length,31);
});

test('AI-to-AI communication remains allowlisted, scoped and audited',()=>{
 assert.equal(communication.status().allowlistOnly,true);assert.equal(communication.status().registeredAIs,31);assert.equal(communication.status().scopeRequired,true);
 const m=communication.send('programmer_ai','security_ai',{task:'ecosystem wiring audit'},{scope:'assigned',task:'ecosystem wiring audit',permissionContext:'ai:programmer_ai',requiredAction:'review',risk:'low'});
 assert.equal(m.policyChecked,true);assert.equal(m.managedBy,'ai_management');assert.equal(m.context.scope,'assigned');assert.equal(m.context.task,'ecosystem wiring audit');
 assert.throws(()=>communication.send('programmer_ai','analytics_ai',{},{scope:'assigned'}),/ai_communication_not_permitted/);
});

test('dual logical memory layers and four physical scopes retain seal/isolation controls',()=>{
 assert.deepEqual(contract.memoryArchitecture.physicalRuntimeScopes,['project','user','character','knowledge']);assert.equal(contract.memoryArchitecture.logicalLayers.length,2);assert.equal(contract.memoryArchitecture.integritySeal,'KV30-MEMORY-SEAL-1');
 const s=memory.status();assert.equal(s.sealed,true);assert.equal(s.sealVerified,true);assert.equal(s.crossMemoryReads,false);assert.equal(s.trainingSeparated,true);assert.equal(s.knowledgeApprovalRequired,true);
});

test('existing External AI boundary remains separate and fail-closed',()=>{
 const s=external.status();assert.equal(s.aiSpecialistGateCount,77);assert.equal(s.providerAlternateGateCount,72);assert.equal(s.defaultFailClosed,true);assert.equal(s.internalAlwaysOn,true);assert.equal(s.externalMasterAdminControlled,true);
 assert.equal(contract.externalBoundary.specialistGateCount,77);assert.equal(contract.externalBoundary.providerAlternateGates,72);assert.ok(contract.externalBoundary.gateCoverageAdded.some(x=>x.gate==='gate_76'&&x.aiRole==='writing_ai'));assert.ok(contract.externalBoundary.gateCoverageAdded.some(x=>x.gate==='gate_77'&&x.aiRole==='media_security_ai'));assert.equal(contract.externalBoundary.defaultEnabled,false);assert.equal(contract.externalBoundary.noExternalBypassOfInternalGovernance,true);
});
