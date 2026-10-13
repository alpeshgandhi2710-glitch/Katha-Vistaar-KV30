const test=require('node:test');
const assert=require('node:assert/strict');
const story=require('../src/services/story-studio.js');

function fixture(){
  return {title:'Test Story',ownerId:'u1',rightsConfirmed:true,mediaRightsConfirmed:true,studioProject:{language:'gu',outline:[{title:'Opening'}],acts:[{number:1,title:'Act 1'}],scenes:[{actId:'',number:1,title:'Scene 1',body:'Asha enters.'}],characters:[{name:'Asha',role:'protagonist'}],beats:[{sceneId:'',order:1,type:'turn',action:'Decision'}],characterMatrix:[],continuity:{canonicalFacts:['Asha lives in Vadodara'],openThreads:[]}}};
}

test('Story Studio validates and normalizes governed structures',()=>{
 const p=story.normalizeProject(fixture().studioProject);
 assert.equal(p.language,'gu');
 assert.equal(p.acts.length,1); assert.equal(p.scenes.length,1); assert.equal(p.characters.length,1); assert.equal(p.beats.length,1);
});

test('Story Studio rejects broken scene/beat references',()=>{
 assert.throws(()=>story.normalizeProject({acts:[],scenes:[{actId:'missing'}],characters:[],beats:[]}),/scene_act_not_found/);
 assert.throws(()=>story.normalizeProject({acts:[],scenes:[{id:'s1'}],characters:[],beats:[{sceneId:'missing'}]}),/beat_scene_not_found/);
});

test('Story Studio save creates revision and readiness evidence without dependencies',()=>{
 const content=fixture(), revisions=new Map(), autosaves=new Map(); content.id='story-1';
 const result=story.saveStory({content,project:content.studioProject,user:{id:'u1'},maps:{revisions,contentAutosaves:autosaves},audit:()=>{}});
 assert.equal(result.ok,true); assert.equal(result.revisionCreated,true);
 assert.equal(revisions.get('story-1').length,1);
 const rd=story.readiness(content); assert.equal(rd.ready,true);
});

test('Story Studio collaboration and review are deterministic',()=>{
 const content=fixture(); content.id='story-2'; const collaborators=new Map();
 const row=story.grant({content,user:{id:'u1'},maps:{collaborators},actor:{userId:'u2'},role:'editor'});
 assert.equal(row.role,'editor');
 const review=story.review(content); assert.ok(review.id.startsWith('REVW-')); assert.ok(Array.isArray(review.findings));
});
