const test=require('node:test');
const assert=require('node:assert/strict');
const master=require('../src/services/all-domain-master-intelligence');
const management=require('../src/services/ai-management');
const communication=require('../src/services/ai-communication');

test('all-domain master intelligence is registered below human/master-admin authority',()=>{
 assert.equal(management.roles[master.ROLE_ID].superior,'master_admin_ai_or_master_admin');
 assert.equal(master.canApply({actorRole:'master_admin',action:'security_policy',approval:{approved:true,role:'master_admin'}}),true);
 assert.equal(master.canApply({actorRole:'admin',action:'security_policy',approval:{approved:true,role:'admin'}}),false);
 assert.equal(master.canApply({actorRole:'user',action:'general'}),true);
});
test('critical master intelligence actions cannot self-authorize',()=>{
 assert.equal(master.canApply({actorRole:'master_admin',action:'product_keys'}),false);
 assert.equal(master.canApply({actorRole:'master_admin',action:'product_keys',approval:{approved:true,role:'admin'}}),false);
});
test('master intelligence creates proposals and governed training plans without activating them',()=>{
 const p=master.proposeNewAI({name:'Example AI',reason:'gap',capabilities:['x','x']});
 assert.equal(p.status,'proposal_only'); assert.deepEqual(p.capabilities,['x']);
 const t=master.trainPlan({targetAI:'security_ai',observations:['observation']});
 assert.equal(t.policyBound,true); assert.equal(t.selfModification,false);
});
test('master intelligence can communicate with registered AI through allowlist',()=>{
 const m=communication.send('all_domain_master_intelligence_ai','security_ai',{task:'review'},{scope:'assigned'});
 assert.equal(m.from,'all_domain_master_intelligence_ai');
 assert.equal(m.context.scope,'assigned');
 assert.throws(()=>communication.send('all_domain_master_intelligence_ai','unknown_ai',{}),/ai_communication_not_permitted/);
});
