'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const studio=require('../../backend/src/services/story-studio');

test('M51 Story media and cover attachment are owner-scoped, rights-gated, and publish-checklist visible',()=>{
  const content={id:'STORY-M51',ownerId:'U1',type:'story',title:'Media Story',rightsConfirmed:true,mediaRightsConfirmed:false,studioProject:studio.normalizeProject({language:'en',outline:[{title:'Hook'}],acts:[{number:1,title:'Act'}],scenes:[{id:'S1',actId:'',title:'Scene',body:'Body'}],characters:[{id:'C1',name:'Asha'}],beats:[{id:'B1',sceneId:'S1',action:'Turn'}],characterMatrix:[],continuity:{facts:[],threads:[]},media:[],cover:null})};
  const mediaAssets=new Map([['A1',{id:'A1',ownerId:'U1',storagePath:'/media/a1',mimeType:'image/jpeg',status:'ready'}],['A2',{id:'A2',ownerId:'U1',storagePath:'/media/a2',mimeType:'audio/mpeg',status:'ready'}],['X1',{id:'X1',ownerId:'U2',storagePath:'/media/x1',mimeType:'image/jpeg',status:'ready'}]]);
  const collaborators=new Map(); const revisions=new Map(); const autosaves=new Map(); const user={id:'U1'};
  assert.throws(()=>studio.setMedia({content,user,maps:{mediaAssets,collaborators,revisions,contentAutosaves:autosaves},media:[{assetId:'X1',rightsConfirmed:true}],audit:()=>{}}),/story_media_asset_forbidden/);
  assert.throws(()=>studio.setMedia({content,user,maps:{mediaAssets,collaborators,revisions,contentAutosaves:autosaves},media:[{assetId:'A2',rightsConfirmed:false}],audit:()=>{}}),/story_media_rights_required/);
  const media=studio.setMedia({content,user,maps:{mediaAssets,collaborators,revisions,contentAutosaves:autosaves},media:[{assetId:'A2',type:'audio',mimeType:'audio/mpeg',status:'ready',rightsConfirmed:true}],audit:()=>{}});
  assert.equal(media.mediaReady,true); assert.equal(content.studioProject.media[0].assetId,'A2');
  assert.throws(()=>studio.setCover({content,user,maps:{mediaAssets,collaborators},cover:{assetId:'A1',alt:'Cover',rightsConfirmed:false},audit:()=>{}}),/story_cover_rights_required/);
  const cover=studio.setCover({content,user,maps:{mediaAssets,collaborators},cover:{assetId:'A1',alt:'Cover',rightsConfirmed:true},audit:()=>{}});
  assert.equal(cover.coverReady,true); assert.equal(content.studioProject.cover.assetId,'A1');
  const checklist=studio.publishingChecklist(content);
  assert.equal(checklist.checks.coverProvided,true); assert.equal(checklist.checks.coverReady,true); assert.equal(checklist.checks.mediaReady,true); assert.equal(checklist.checks.mediaRights,true); assert.equal(checklist.ready,false);
});

test('M51 Story Studio UI exposes governed media/cover controls without hardcoded user-facing labels',()=>{
  const fs=require('node:fs');const app=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
  assert.match(app,/id="storyAttachMedia"/);assert.match(app,/id="storyAttachCover"/);assert.ok(app.includes("'/api/studio/story/'+encodeURIComponent(cid)+'/media'"));assert.ok(app.includes("'/api/studio/story/'+encodeURIComponent(cid)+'/cover'"));assert.match(app,/x\('mediaRights'\)/);assert.match(app,/x\('cover'\)/);
});
