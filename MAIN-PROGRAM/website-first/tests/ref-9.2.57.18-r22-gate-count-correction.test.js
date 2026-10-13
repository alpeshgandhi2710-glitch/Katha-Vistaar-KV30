const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const g=JSON.parse(fs.readFileSync(path.join(ROOT,'config/external-gate-configuration-profile-v30.json'),'utf8'));
const a=JSON.parse(fs.readFileSync(path.join(ROOT,'config/external-service-architecture-audit-v30.json'),'utf8'));
test('R22 corrects historical 100-gate counting without losing project-memory gates',()=>{
 assert.equal(g.nonAi.length+g.aiSpecialist.length,100);
 assert.equal(g.projectMemory.length,3);
 assert.equal(a.totalGovernedGateRecords,103);
 assert.equal(a.providerServiceClassCount,24);
 assert.equal(a.providerAlternateGateCount,72);
 assert.equal(a.semanticFinding.includes('24 service classes × 3'),true);
});
console.log('PASS R22 count correction: 100 canonical primary + 3 project-memory governance = 103; 72 alternates across 24 service classes');
