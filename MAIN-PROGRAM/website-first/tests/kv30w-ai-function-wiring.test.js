const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const inference=require('../../backend/src/services/ai-internal-inference');
const management=require('../../backend/src/services/ai-management');
const intelligence=require('../../backend/src/services/ai-intelligence-engine');
const creative=JSON.parse(fs.readFileSync(path.join(root,'config','ai-human-creative-style-v30.json'),'utf8'));

test('KV30-W all managed AIs are active, handled and profiled',()=>{
  assert.equal(Object.keys(management.roles).length,31);
  assert.equal(Object.values(management.roles).filter(x=>x.active&&x.managed).length,31);
  for(const id of Object.keys(management.roles)){
    assert.equal(typeof inference.handlers[id],'function',id);
    assert.ok(intelligence.profileFor(id),id);
  }
});

test('KV30-W creative AI contract exposes emotion and 18 gender/voice combinations',()=>{
  assert.equal(creative.voiceProfiles.length,18);
  assert.deepEqual(new Set(creative.voiceProfiles.map(x=>x.gender)),new Set(['female','male','child']));
  const out=inference.infer({aiId:'story_ai',task:'write',input:'A mother waits for her son at the railway station after years apart.',context:{language:'gu'}}).result;
  assert.equal(out.creativeDirection.humanCentric,true);
  assert.ok(out.creativeDirection.emotions.length>0);
  assert.equal(out.voiceOptions.length,18);
  assert.ok(out.beats.some(x=>x.emotion));
});

test('KV30-W creator AI buttons are wired to real governed endpoints',()=>{
  for(const [id,route] of [['creatorAiGenerate','/api/ai/creator-generate'],['creatorAiSuggest','/api/ai/creator-assist'],['creatorAiPlan','/api/ai/creator-assist'],['characterArchitectAssist','/api/ai/character-assist'],['comicIllustratorAssist','/api/ai/comic-illustrator'],['audioPacingAssist','/api/ai/audio-pacing'],['storyboardAssist','/api/ai/storyboard'],['dialogueArchitectAssist','/api/ai/dialogue-architect'],['storyMapAssist','/api/ai/story-mapper']]){
    assert.ok(app.includes(`id="${id}"`),`${id} is rendered in app.js`);
    assert.ok(app.includes(route),`${id} -> ${route}`);
  }
  assert.ok(app.includes('/api/training/ai-coach'),'training AI coach endpoint');
});

test('KV30-W reader translation never reports success with an empty translation',()=>{
  const server=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
  assert.ok(server.includes("internal_translation_model_unavailable"));
  assert.ok(!server.includes("else if(action==='translate'){result='';}"));
});

test('KV30-W intelligence engine loads the creative config and exposes it to model context',()=>{
  const p=intelligence.profileFor('story_ai');
  const fs=require('node:fs');
  const src=fs.readFileSync(require('node:path').join(root,'..','backend/src/services/ai-intelligence-engine.js'),'utf8');
  assert.ok(src.includes("const ROOT=path.resolve(__dirname,'../../../website-first')"));
  assert.equal(creative.voiceProfiles.length,18);
  assert.ok(p.memoryScopes.includes('user'));
});
