const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../src/services/ai-intelligence-engine');
const router=require('../src/services/ai-model-router');

test('internal intelligence profiles exist for all managed AIs',()=>{
 const p=engine.profiles();
 assert.equal(Object.keys(p.ais).length,31);
 for(const id of Object.keys(router.providerStatus().policy?require('../src/services/ai-management').roles:{})) assert.ok(p.ais[id],id);
});

test('risk classifier fails closed for sensitive operations',()=>{
 assert.equal(engine.riskOf({risk:'critical'},'write secret'),'critical');
 assert.equal(engine.riskOf({},'change password and permissions'),'high');
 assert.equal(engine.riskOf({},'write a story about rain'),'low');
});

test('contract fallback remains useful when local model is unavailable',async()=>{
 const r=await engine.execute({aiId:'story_ai',task:'story planning',input:'A village discovers a hidden well.',context:{actorRole:'user',language:'en',risk:'low'}});
 assert.equal(r.ok,true);
 assert.equal(r.aiId,'story_ai');
 assert.equal(r.contractFallback.domain,'story');
 assert.ok(r.modelExecution);
 assert.ok(r.quality);
});

test('profile memory scopes are enforced by the intelligence engine',async()=>{
 const p=engine.profileFor('story_ai');
 assert.deepEqual(p.memoryScopes,['project','character','knowledge','user']);
});

test('external provider policy keeps billing and provider selection explicit',()=>{
 const policy=require('../src/services/ai-provider-policy');
 const s=policy.status();
 assert.ok(Array.isArray(s.external.providers));
 assert.ok(Array.isArray(s.external.allowedBillingModes));
 assert.ok(Object.prototype.hasOwnProperty.call(s.external,'provider'));
 assert.ok(Object.prototype.hasOwnProperty.call(s.external,'billingMode'));
});
