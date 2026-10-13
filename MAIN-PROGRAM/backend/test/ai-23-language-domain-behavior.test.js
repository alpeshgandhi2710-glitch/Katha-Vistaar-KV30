'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const router=require('../src/services/ai-model-router.js');

const languages=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../website-first/config/languages.json'),'utf8')).languages.map(x=>String(x.code));
if(!languages.includes('en')) languages.unshift('en');
const domains=[
  {name:'writer',aiId:'writing_ai',task:'writer_draft_assist',input:'Write a short opening scene with a clear character goal.'},
  {name:'reader',aiId:'story_ai',task:'reader_summary_emotion_aware',input:'Summarize the reader passage and identify its emotional turn.'},
  {name:'fm',aiId:'audio_ai',task:'fm_narration_emotion_direction',input:'Prepare narration pacing and emotion guidance for a short audio scene.'},
  {name:'reel',aiId:'reel_ai',task:'reel_storyboard_emotion_aware',input:'Plan a short vertical reel with five visual beats and a clear ending.'},
  {name:'comic',aiId:'comic_ai',task:'comic_panel_plan_emotion_aware',input:'Plan four comic panels with dialogue, visual continuity and emotion.'}
];

test('23-language reader/writer/FM/reel/comic internal behavior contract',async()=>{
  assert.equal(languages.length,23,'canonical language registry must expose 23 languages');
  let cases=0;
  for(const language of languages){
    for(const domain of domains){
      const r=await router.routeAsync({
        aiId:domain.aiId,
        task:domain.task,
        input:domain.input,
        context:{actorRole:'user',userId:`behavior-${language}`,language,contentType:domain.name==='fm'?'audio':domain.name,taskMode:'behavioral-contract'},
        allowExternal:false
      });
      assert.equal(r.ok,true,`${domain.name}/${language} must execute`);
      assert.equal(r.externalUsed,false,`${domain.name}/${language} must not use external AI`);
      assert.equal(r.governance.externalUsed,false,`${domain.name}/${language} governance must report internal-only`);
      const contract=r.result.result||{};
      assert.equal(contract.language,language,`${domain.name}/${language} must preserve requested language`);
      assert.ok(contract.languageSupport?.allSupported,`${domain.name}/${language} must expose language support contract`);
      assert.ok(r.result.finalOutput||contract,`${domain.name}/${language} must return a governed output contract`);
      assert.ok(['internal-local-model','internal-contract-fallback'].includes(r.providerPath),`${domain.name}/${language} provider path must remain internal`);
      cases++;
    }
  }
  assert.equal(cases,23*domains.length);
});
