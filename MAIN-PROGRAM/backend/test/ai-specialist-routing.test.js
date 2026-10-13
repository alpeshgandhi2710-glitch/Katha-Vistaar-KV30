const test=require('node:test');
const assert=require('node:assert/strict');
const router=require('../src/services/ai-model-router');
const management=require('../src/services/ai-management');
const {SPECIALIST_TASKS}=router;

test('all 31 managed Internal AIs have task routing contracts',()=>{
 const status=router.specialistTaskStatus();
 assert.equal(Object.keys(management.roles).length,31);
 assert.equal(Object.keys(status).length,31);
 for(const id of Object.keys(management.roles)){
  assert.ok(status[id],id);
  assert.ok(status[id].tasks.length>0,id);
 }
});

test('specialist task routing selects the AI matching the work',()=>{
 assert.equal(router.resolveSpecialistForTask('story planning').aiId,'story_ai');
 assert.equal(router.resolveSpecialistForTask('character personality continuity').aiId,'character_ai');
 assert.equal(router.resolveSpecialistForTask('text to speech narration').aiId,'audio_ai');
 assert.equal(router.resolveSpecialistForTask('comic panel storyboard').aiId,'comic_ai');
 assert.equal(router.resolveSpecialistForTask('security analysis').aiId,'security_ai');
 assert.equal(router.resolveSpecialistForTask('ledger reconciliation').aiId,'accounting_ai');
 assert.equal(router.resolveSpecialistForTask('reel publishing').aiId,'reel_ai');
 assert.equal(router.resolveSpecialistForTask('prose refinement').aiId,'writing_ai');
 assert.equal(router.resolveSpecialistForTask('media rights scan').aiId,'media_security_ai');
});

test('canonical specialist-gate registry covers all managed AIs without implicit gate creation',()=>{
 const status=router.specialistTaskStatus();
 const all=[...new Set(Object.values(status).flatMap(x=>x.gateIds))];
 assert.equal(all.length,74);
 assert.equal(status.writing_ai.gateIds.length,1);
 assert.equal(status.media_security_ai.gateIds.length,1);
 assert.equal(all.includes('gate_76'),true);
 assert.equal(all.includes('gate_77'),true);
 assert.ok(status.story_ai.gateIds.includes('gate_18'));
 assert.ok(status.ai_orchestrator.gateIds.includes('gate_75'));
 assert.deepEqual(status.writing_ai.gateIds,['gate_76']);
 assert.deepEqual(status.media_security_ai.gateIds,['gate_77']);
 for(const id of Object.keys(SPECIALIST_TASKS)){assert.equal(status[id].gateBacked,true,id);assert.ok(status[id].gateIds.length>=1,id);}
});
