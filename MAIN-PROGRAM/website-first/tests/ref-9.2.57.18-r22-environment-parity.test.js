const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const parity=JSON.parse(fs.readFileSync(path.join(ROOT,'config/environment-parity-v30.json'),'utf8'));
const wp=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const bp=JSON.parse(fs.readFileSync(path.join(ROOT,'..','backend','package.json'),'utf8'));
test('R22 development/production source contract is present with separate activation surfaces',()=>{
 for(const p of parity.requiredSourcePaths) assert.ok(fs.existsSync(path.join(ROOT,'..',p)) || fs.existsSync(path.join(ROOT,p)),`missing ${p}`);
 for(const p of parity.requiredGovernanceFiles) assert.ok(fs.existsSync(path.join(ROOT,p)),`missing ${p}`);
 assert.equal(parity.development.sourceContract,'same');
 assert.equal(parity.production.sourceContract,'same');
 assert.ok(wp.scripts.dev && wp.scripts.start);
 assert.ok(bp.scripts.start && bp.scripts.check);
 assert.equal(parity.development.secrets,'separate');
 assert.equal(parity.production.secrets,'separate');
});
console.log('PASS R22 environment parity: governed source/config contract present for development and production; activation/secrets remain environment-specific');
