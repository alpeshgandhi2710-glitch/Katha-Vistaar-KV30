'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const studio=require('../../backend/src/services/story-studio');

test('M53 Story AI assist is explicit-proposal and internal-first',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');
 assert.match(server,/story-studio-ai-assist/);assert.match(server,/allowExternal:false/);assert.match(server,/creatorApprovalRequired:true/);assert.match(server,/story_ai_assist_proposed/);
});

test('M53 Story AI apply requires explicit creator approval and preserves role boundary',()=>{
 const content={id:'M53',ownerId:'OWNER',type:'story',title:'T',body:'B',summary:'S',language:'en',studioProject:studio.normalizeProject({language:'en',outline:[{title:'O'}],scenes:[{id:'S1',title:'S',body:''}],characters:[{id:'C1',name:'A'}],beats:[],characterMatrix:[],continuity:{facts:[],threads:[]},media:[],cover:null}),storyAiProposals:[{id:'P1',storyId:'M53',task:'story_map',language:'en',structured:{title:'New',body:'New body'},createdAt:Date.now(),approvalRequired:true,applied:false}]};
 const collaborators=new Map([[content.id,[{id:'COL',userId:'REVIEWER',role:'reviewer',active:true}]]]);
 assert.throws(()=>studio.saveStory({content,project:content.studioProject,user:{id:'REVIEWER'},maps:{collaborators,revisions:new Map(),contentAutosaves:new Map()},audit:()=>{}}),/story_collaboration_role_forbidden/);
 assert.equal(content.storyAiProposals[0].applied,false);
});

test('M53 Story Studio exposes governed AI assist control without hardcoded UI label',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(app,/id="storyAiAssist"/);assert.ok(app.includes("'/api/studio/story/'+encodeURIComponent(cid)+'/ai-assist'"));assert.match(app,/x\('aiCreatorTools'\)/);
});
