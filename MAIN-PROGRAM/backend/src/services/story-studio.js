'use strict';

// KV30-native Story Studio domain service.
// No external dependency. All state is supplied by the caller.
const crypto = require('node:crypto');

const MAX = { acts: 50, scenes: 500, characters: 200, beats: 2000, revisions: 50, collaborators: 50, media: 1000, characterMatrix: 20000, continuityFacts: 10000, continuityThreads: 10000 };
const MATRIX_RELATIONSHIP_TYPES = new Set(['family','friend','ally','rival','enemy','mentor','mentee','romantic','professional','acquaintance','other']);
const CONTINUITY_FACT_TYPES = new Set(['fact','timeline','location','character','scene','beat','custom']);
const CONTINUITY_STATUS = new Set(['open','confirmed','resolved','superseded']);
const ROLES = new Set(['owner','editor','writer','reviewer','viewer']);

const id = prefix => `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const now = () => new Date().toISOString();
const text = (v, max=10000) => String(v ?? '').slice(0,max);
const arr = (v, max) => Array.isArray(v) && v.length <= max;
const clone = v => JSON.parse(JSON.stringify(v));

function cleanList(list, max, mapper){
  if(list === undefined) return [];
  if(!arr(list,max)) throw new Error('story_array_limit_exceeded');
  return list.map((x,i)=>mapper(x,i));
}


function normalizeCharacterMatrix(input){
  if(input===undefined) return [];
  if(!Array.isArray(input) || input.length>MAX.characterMatrix) throw new Error('character_matrix_limit_exceeded');
  const seen=new Set();
  return input.map((x,i)=>{
    if(!x || typeof x!=='object' || Array.isArray(x)) throw new Error('character_matrix_entry_invalid');
    const row={
      id:String(x.id||id('CMX')),
      characterId:String(x.characterId||x.fromCharacterId||''),
      relatedCharacterId:String(x.relatedCharacterId||x.toCharacterId||''),
      relationshipType:text(x.relationshipType||x.type||'other',40).toLowerCase(),
      label:text(x.label,200),
      description:text(x.description,2000),
      strength:Number.isFinite(Number(x.strength))?Math.max(0,Math.min(1,Number(x.strength))):null,
      provenance:x.provenance && typeof x.provenance==='object' ? clone(x.provenance) : {sourceType:'creator',sourceId:null},
      updatedAt:now()
    };
    if(!row.characterId || !row.relatedCharacterId) throw new Error('character_matrix_character_required');
    if(row.characterId===row.relatedCharacterId) throw new Error('character_matrix_self_reference');
    if(!MATRIX_RELATIONSHIP_TYPES.has(row.relationshipType)) throw new Error('character_matrix_relationship_type_invalid');
    if(seen.has(row.id)) throw new Error('character_matrix_duplicate_id');
    seen.add(row.id);
    return row;
  });
}

function normalizeContinuity(input){
  const c=(input && typeof input==='object' && !Array.isArray(input)) ? input : {};
  const facts=Array.isArray(c.facts)?c.facts:(Array.isArray(c.canonicalFacts)?c.canonicalFacts:[]);
  const threads=Array.isArray(c.threads)?c.threads:(Array.isArray(c.openThreads)?c.openThreads:[]);
  if(facts.length>MAX.continuityFacts || threads.length>MAX.continuityThreads) throw new Error('continuity_limit_exceeded');
  const factIds=new Set();
  const normalizeFact=(x,prefix)=>{
    const isObj=x && typeof x==='object' && !Array.isArray(x);
    const row={
      id:String((isObj&&x.id)||id(prefix)),
      text:text(isObj?(x.text??x.value??x.description):x,5000),
      type:text(isObj?(x.type||'fact'):'fact',30).toLowerCase(),
      status:text(isObj?(x.status||'confirmed'):'confirmed',30).toLowerCase(),
      provenance:isObj&&x.provenance&&typeof x.provenance==='object'?clone(x.provenance):{sourceType:'creator',sourceId:null},
      characterIds:Array.isArray(isObj&&x.characterIds)?x.characterIds.map(v=>String(v)):[],
      sceneIds:Array.isArray(isObj&&x.sceneIds)?x.sceneIds.map(v=>String(v)):[],
      beatIds:Array.isArray(isObj&&x.beatIds)?x.beatIds.map(v=>String(v)):[],
      updatedAt:now()
    };
    if(!row.text) throw new Error('continuity_fact_text_required');
    if(!CONTINUITY_FACT_TYPES.has(row.type)) throw new Error('continuity_fact_type_invalid');
    if(!CONTINUITY_STATUS.has(row.status)) throw new Error('continuity_fact_status_invalid');
    if(factIds.has(row.id)) throw new Error('continuity_duplicate_id');
    factIds.add(row.id); return row;
  };
  const normalizedFacts=facts.map(x=>normalizeFact(x,'FACT'));
  const normalizedThreads=threads.map(x=>normalizeFact(x,'THR')).map(x=>({...x,status:x.status==='confirmed'?'open':x.status}));
  return {
    timeline:Array.isArray(c.timeline)?clone(c.timeline).slice(0,MAX.continuityFacts):[],
    locations:Array.isArray(c.locations)?clone(c.locations).slice(0,MAX.continuityFacts):[],
    facts:normalizedFacts,
    threads:normalizedThreads,
    canonicalFacts:normalizedFacts.map(x=>x.text),
    openThreads:normalizedThreads.map(x=>x.text)
  };
}

function normalizeProject(input={}){
  if(!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_story_project');
  const p = {
    version: 'KV30-STORY-STUDIO-1',
    language: text(input.language || input.languageCode || 'en',20),
    title: text(input.title,200),
    premise: text(input.premise,10000),
    outline: cleanList(input.outline,200,(x)=>typeof x==='object'?{id:String(x.id||id('OUT')),title:text(x.title,200),summary:text(x.summary,3000)}:text(x,3000)),
    acts: cleanList(input.acts,MAX.acts,(x,i)=>({id:String(x?.id||id('ACT')),number:Number(x?.number||i+1),title:text(x?.title,200),summary:text(x?.summary,5000),goal:text(x?.goal,3000),conflict:text(x?.conflict,3000),status:text(x?.status||'draft',30)})),
    scenes: cleanList(input.scenes,MAX.scenes,(x,i)=>({id:String(x?.id||id('SCN')),actId:String(x?.actId||''),chapterId:String(x?.chapterId||''),number:Number(x?.number||i+1),title:text(x?.title,200),summary:text(x?.summary,5000),location:text(x?.location,300),time:text(x?.time,200),pov:text(x?.pov,200),body:text(x?.body,20000),status:text(x?.status||'draft',30)})),
    characters: cleanList(input.characters,MAX.characters,(x)=>({id:String(x?.id||id('CHR')),name:text(x?.name,200),role:text(x?.role,100),description:text(x?.description,5000),goal:text(x?.goal,3000),arc:text(x?.arc,5000),facts:Array.isArray(x?.facts)?x.facts.slice(0,100).map(v=>text(v,500)):[],relationships:Array.isArray(x?.relationships)?x.relationships.slice(0,100).map(v=>clone(v)):[]})),
    beats: cleanList(input.beats,MAX.beats,(x,i)=>({id:String(x?.id||id('BEAT')),sceneId:String(x?.sceneId||''),order:Number(x?.order||i+1),type:text(x?.type,80),emotion:text(x?.emotion,120),action:text(x?.action,3000),purpose:text(x?.purpose,2000)})),
    characterMatrix: normalizeCharacterMatrix(input.characterMatrix),
    continuity: normalizeContinuity(input.continuity),
    translationDrafts: input.translationDrafts && typeof input.translationDrafts==='object' ? clone(input.translationDrafts) : {},
    media: cleanList(input.media,MAX.media,(x)=>({id:String(x?.id||id('MED')),assetId:text(x?.assetId,200),type:text(x?.type,50),position:text(x?.position,100),caption:text(x?.caption,1000),rightsConfirmed:x?.rightsConfirmed===true,status:text(x?.status,30),mimeType:text(x?.mimeType,80)})),
    cover: input.cover && typeof input.cover==='object' ? {assetId:text(input.cover.assetId,200),alt:text(input.cover.alt,500),rightsConfirmed:input.cover.rightsConfirmed===true,status:text(input.cover.status,30),mimeType:text(input.cover.mimeType,80)} : null,
    metadata: input.metadata && typeof input.metadata==='object' ? clone(input.metadata) : {},
    updatedAt: now()
  };
  validateProject(p);
  return p;
}

function validateProject(p){
  const ids = new Set(p.characters.map(x=>x.id));
  const sceneIds = new Set(p.scenes.map(x=>x.id));
  const beatIds = new Set(p.beats.map(x=>x.id));
  const matrixIds = new Set();
  for(const s of p.scenes) if(s.actId && !p.acts.some(a=>a.id===s.actId)) throw new Error('scene_act_not_found');
  for(const b of p.beats) if(b.sceneId && !sceneIds.has(b.sceneId)) throw new Error('beat_scene_not_found');
  for(const m of p.characterMatrix){
    if(matrixIds.has(String(m.id))) throw new Error('character_matrix_duplicate_id');
    matrixIds.add(String(m.id));
    if(!ids.has(String(m.characterId)) || !ids.has(String(m.relatedCharacterId))) throw new Error('character_matrix_character_not_found');
    if(String(m.characterId)===String(m.relatedCharacterId)) throw new Error('character_matrix_self_reference');
  }
  const facts=[...(p.continuity?.facts||[]),...(p.continuity?.threads||[])];
  for(const f of facts){
    for(const cid of f.characterIds||[]) if(!ids.has(String(cid))) throw new Error('continuity_character_not_found');
    for(const sid of f.sceneIds||[]) if(!sceneIds.has(String(sid))) throw new Error('continuity_scene_not_found');
    for(const bid of f.beatIds||[]) if(!beatIds.has(String(bid))) throw new Error('continuity_beat_not_found');
  }
  for(const m of p.media) if(m.rightsConfirmed!==true) throw new Error('story_media_rights_required');
  if(p.cover && p.cover.assetId && p.cover.rightsConfirmed!==true) throw new Error('story_cover_rights_required');
  return true;
}

function storyMap(store, idValue){ const row=store.get(String(idValue)); if(!row) throw new Error('story_not_found'); return row; }
function requireOwner(user, story){ if(!user || String(story.ownerId)!==String(user.id)) throw new Error('story_forbidden'); }

function collaborationRole(user, story, collaborators){
  if(!user) throw new Error('story_forbidden');
  if(String(story.ownerId)===String(user.id)) return 'owner';
  const row=(collaborators.get(story.id)||[]).find(x=>String(x.userId)===String(user.id)&&x.active!==false);
  if(!row) throw new Error('story_forbidden');
  return row.role;
}

function requireCollaborator(user, story, collaborators, roles){
  const role=collaborationRole(user,story,collaborators);
  if(!roles.includes(role)) throw new Error('story_collaboration_role_forbidden');
  return role;
}

function saveStory({content, project, user, maps, audit, patch={}}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const before={title:content.title,body:content.body,summary:content.summary,language:content.language,studioProject:clone(content.studioProject||{})};
  const normalized=normalizeProject(project);
  if(patch.title!==undefined) content.title=text(patch.title,200);
  if(patch.body!==undefined) content.body=text(patch.body,200000);
  if(patch.summary!==undefined) content.summary=text(patch.summary,5000);
  if(patch.language!==undefined) content.language=text(patch.language,20);
  content.studioProject=normalized;
  content.updatedAt=now();
  const history=maps.revisions.get(content.id)||[];
  history.unshift({id:id('REV'),contentId:content.id,createdAt:now(),actorId:user.id,title:before.title,body:before.body,summary:before.summary,language:before.language,studioProject:before.studioProject,reason:'story_studio_save'});
  maps.revisions.set(content.id,history.slice(0,MAX.revisions));
  maps.contentAutosaves.delete(content.id);
  maps.persistence?.();
  audit?.({actor:user.id,action:'story_studio_saved',resourceType:'story',resourceId:content.id,result:'saved'});
  return {ok:true,story:clone(content),revisionCreated:true,studioProject:clone(normalized)};
}

function autosave({content,user,maps,data,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const current=content.studioProject||{};
  const merged={...current,...(data.project||{}),title:data.title??current.title,language:data.language??current.language};
  const project=normalizeProject(merged);
  const row={id:id('AUTO'),contentId:content.id,ownerId:user.id,project,title:data.title!==undefined?text(data.title,200):content.title,body:data.body!==undefined?text(data.body,200000):content.body,summary:data.summary!==undefined?text(data.summary,5000):content.summary,language:text(project.language||data.language||content.language||'en',20),savedAt:now(),source:'story_studio_remote_autosave'};
  maps.contentAutosaves.set(content.id,row); maps.persistence?.();
  audit?.({actor:user.id,action:'story_studio_autosave',resourceType:'story',resourceId:content.id,result:'saved'});
  return {ok:true,autosaved:true,autosave:clone(row)};
}

function restoreRevision({content,user,maps,revisionId,audit}){
  requireOwner(user,content);
  const history=maps.revisions.get(content.id)||[];
  const target=history.find(x=>String(x.id)===String(revisionId));
  if(!target) throw new Error('story_revision_not_found');
  const before={title:content.title,body:content.body,summary:content.summary,language:content.language,studioProject:clone(content.studioProject||{})};
  content.title=text(target.title,200);
  content.body=text(target.body,200000);
  content.summary=text(target.summary,5000);
  content.language=text(target.language||content.language||'en',20);
  content.studioProject=normalizeProject(target.studioProject||{});
  content.updatedAt=now();
  history.unshift({id:id('REV'),contentId:content.id,createdAt:now(),actorId:user.id,title:before.title,body:before.body,summary:before.summary,language:before.language,studioProject:before.studioProject,reason:'story_revision_restore',restoredRevisionId:String(target.id)});
  maps.revisions.set(content.id,history.slice(0,MAX.revisions));
  maps.contentAutosaves.delete(content.id);
  maps.persistence?.();
  audit?.({actor:user.id,action:'story_revision_restored',resourceType:'story',resourceId:content.id,result:'restored',metadata:{restoredRevisionId:String(target.id)}});
  return {ok:true,restored:true,story:clone(content),restoredRevisionId:String(target.id)};
}

function grant({content,user,maps,actor,role,audit}){
  requireOwner(user,content); const r=text(role,'30'); if(!ROLES.has(r)||r==='owner') throw new Error('invalid_story_collaboration_role');
  const targetId=text(actor?.userId||actor?.id||'',200); if(!targetId) throw new Error('collaborator_required');
  if(String(targetId)===String(user.id)) throw new Error('collaborator_self_forbidden');
  const list=maps.collaborators.get(content.id)||[];
  if(list.some(x=>x.userId===targetId)) throw new Error('collaborator_exists');
  const row={id:id('COL'),contentId:content.id,userId:targetId,role:r,grantedBy:user.id,createdAt:now(),updatedAt:now(),active:true};
  list.push(row); maps.collaborators.set(content.id,list); maps.persistence?.(); audit?.({actor:user.id,action:'story_collaborator_granted',resourceType:'story',resourceId:content.id,result:'granted'}); return row;
}


function listCollaborators({content,user,maps}){
  requireOwner(user,content);
  return clone(maps.collaborators.get(content.id)||[]);
}

function updateCollaborator({content,user,maps,collaboratorId,role,audit}){
  requireOwner(user,content);
  const r=text(role,'30'); if(!ROLES.has(r)||r==='owner') throw new Error('invalid_story_collaboration_role');
  const list=maps.collaborators.get(content.id)||[];
  const row=list.find(x=>String(x.id)===String(collaboratorId));
  if(!row || row.active===false) throw new Error('collaborator_not_found');
  row.role=r; row.updatedAt=now();
  maps.collaborators.set(content.id,list); maps.persistence?.();
  audit?.({actor:user.id,action:'story_collaborator_role_updated',resourceType:'story',resourceId:content.id,result:'updated',metadata:{collaboratorId:String(row.id),role:r}});
  return clone(row);
}

function revokeCollaborator({content,user,maps,collaboratorId,audit}){
  requireOwner(user,content);
  const list=maps.collaborators.get(content.id)||[];
  const row=list.find(x=>String(x.id)===String(collaboratorId));
  if(!row || row.active===false) throw new Error('collaborator_not_found');
  row.active=false; row.updatedAt=now(); row.revokedAt=now(); row.revokedBy=user.id;
  maps.collaborators.set(content.id,list); maps.persistence?.();
  audit?.({actor:user.id,action:'story_collaborator_revoked',resourceType:'story',resourceId:content.id,result:'revoked',metadata:{collaboratorId:String(row.id)}});
  return clone(row);
}

function mediaAssetFor(user, mediaAssets, assetId){
  const idValue=String(assetId||'');
  const asset=mediaAssets?.get(idValue);
  if(!asset || String(asset.ownerId)!==String(user.id)) throw new Error('story_media_asset_forbidden');
  if(!asset.storagePath) throw new Error('story_media_asset_unavailable');
  return asset;
}

function setMedia({content,user,maps,media,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  if(!Array.isArray(media)) throw new Error('story_media_array_required');
  if(media.length>MAX.media) throw new Error('story_media_limit_exceeded');
  const rows=media.map((item)=>{
    const asset=mediaAssetFor(user,maps.mediaAssets,item?.assetId);
    return {id:String(item?.id||id('MED')),assetId:asset.id,type:text(item?.type||asset.mimeType,50),position:text(item?.position,100),caption:text(item?.caption,1000),rightsConfirmed:item?.rightsConfirmed===true,status:String(asset.status||'unknown'),mimeType:String(asset.mimeType||'')};
  });
  if(rows.some(x=>x.rightsConfirmed!==true)) throw new Error('story_media_rights_required');
  content.studioProject=normalizeProject({...content.studioProject,media:rows});
  content.mediaAssetIds=rows.map(x=>x.assetId);
  content.mediaAssetId=rows[0]?.assetId||null;
  content.mediaRightsConfirmed=rows.length>0;
  content.updatedAt=now();
  maps.persistence?.();
  audit?.({actor:user.id,action:'story_media_attached',resourceType:'story',resourceId:content.id,result:'attached',metadata:{count:rows.length}});
  return {ok:true,media:clone(rows),mediaReady:rows.every(x=>['ready','rendered'].includes(x.status))};
}

function setCover({content,user,maps,cover,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  if(!cover || !cover.assetId) throw new Error('story_cover_asset_required');
  const asset=mediaAssetFor(user,maps.mediaAssets,cover.assetId);
  if(!/^image\//i.test(String(asset.mimeType||''))) throw new Error('story_cover_image_required');
  if(cover.rightsConfirmed!==true) throw new Error('story_cover_rights_required');
  const row={assetId:asset.id,alt:text(cover.alt,500),rightsConfirmed:true,status:String(asset.status||'unknown'),mimeType:String(asset.mimeType||'')};
  content.studioProject=normalizeProject({...content.studioProject,cover:row});
  content.cover=asset.id;
  content.updatedAt=now();
  maps.persistence?.();
  audit?.({actor:user.id,action:'story_cover_attached',resourceType:'story',resourceId:content.id,result:'attached',metadata:{assetId:asset.id,status:row.status}});
  return {ok:true,cover:clone(row),coverReady:['ready','rendered'].includes(row.status)};
}


function saveCharacterMatrix({content,user,maps,characterMatrix,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const project=clone(content.studioProject||{}); project.characterMatrix=characterMatrix;
  const result=saveStory({content,project,user,maps,audit});
  audit?.({actor:user.id,action:'story_character_matrix_updated',resourceType:'story',resourceId:content.id,result:'updated',metadata:{count:project.characterMatrix.length}});
  return result;
}

function saveContinuity({content,user,maps,continuity,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const project=clone(content.studioProject||{}); project.continuity=continuity;
  const result=saveStory({content,project,user,maps,audit});
  audit?.({actor:user.id,action:'story_continuity_updated',resourceType:'story',resourceId:content.id,result:'updated',metadata:{facts:project.continuity.facts.length,threads:project.continuity.threads.length}});
  return result;
}

function saveTranslationDraft({content,user,maps,language,draft,audit,languageValidator}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const code=String(language||'').trim();
  if(!code) throw new Error('story_translation_language_required');
  if(typeof languageValidator==='function' && !languageValidator(code)) throw new Error('story_translation_language_invalid');
  const project=clone(content.studioProject||{});
  const drafts=project.translationDrafts&&typeof project.translationDrafts==='object'?clone(project.translationDrafts):{};
  const value=draft&&typeof draft==='object'?clone(draft):{text:String(draft??'')};
  drafts[code]={...value,language:code,updatedAt:now(),updatedBy:String(user.id)};
  project.translationDrafts=drafts;
  const result=saveStory({content,project,user,maps,audit});
  audit?.({actor:user.id,action:'story_translation_draft_updated',resourceType:'story',resourceId:content.id,result:'updated',metadata:{language:code}});
  return {ok:true,language:code,draft:clone(drafts[code]),story:result.story};
}

function listTranslationDrafts({content,user,maps}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer','reviewer']);
  return clone(content.studioProject?.translationDrafts||{});
}

function removeCharacter({content,user,maps,characterId,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','writer']);
  const project=clone(content.studioProject||{});
  const cid=String(characterId||'');
  if(!project.characters?.some(x=>String(x.id)===cid)) throw new Error('story_character_not_found');
  if((project.characterMatrix||[]).some(x=>String(x.characterId)===cid||String(x.relatedCharacterId)===cid)) throw new Error('story_character_dependency_matrix');
  if([...(project.continuity?.facts||[]),...(project.continuity?.threads||[])].some(x=>(x.characterIds||[]).some(v=>String(v)===cid))) throw new Error('story_character_dependency_continuity');
  project.characters=project.characters.filter(x=>String(x.id)!==cid);
  const result=saveStory({content,project,user,maps,audit});
  audit?.({actor:user.id,action:'story_character_removed',resourceType:'story',resourceId:content.id,result:'removed',metadata:{characterId:cid}});
  return result;
}

function publishingChecklist(content){
  const base=readiness(content);
  const p=content.studioProject||{};
  const media=Array.isArray(p.media)?p.media:[];
  const cover=p.cover||null;
  const checks={...base.checks,creatorApproval:content.storyPublicationApproval===true,coverProvided:!!cover?.assetId,coverReady:!cover?.assetId||['ready','rendered'].includes(String(cover.status||'')),mediaReady:media.every(x=>['ready','rendered'].includes(String(x.status||''))),mediaRights:media.every(x=>x.rightsConfirmed===true)};
  const blocking={...checks,coverProvided:true};
  const ready=Object.entries(blocking).filter(([k])=>k!=='coverProvided').every(([,v])=>v);
  return {ready,checks,advisories:cover?.assetId?[]:['cover_missing'],calculatedAt:now(),version:'KV30-STORY-PUBLISH-CHECKLIST-2'};
}

function readiness(content){
  const p=content.studioProject||{};
  const matrix=Array.isArray(p.characterMatrix)?p.characterMatrix:[];
  const continuity=p.continuity&&typeof p.continuity==='object'?p.continuity:{};
  const facts=Array.isArray(continuity.facts)?continuity.facts:[];
  const threads=Array.isArray(continuity.threads)?continuity.threads:[];
  let structureReady=true;
  try { validateProject(normalizeProject(p)); } catch { structureReady=false; }
  const matrixReady=matrix.every(m=>m&&m.characterId&&m.relatedCharacterId);
  const continuityReady=facts.concat(threads).every(f=>f&&String(f.text||'').trim()&&Array.isArray(f.characterIds)&&Array.isArray(f.sceneIds)&&Array.isArray(f.beatIds));
  const checks={title:!!text(content.title).trim(),language:!!text(p.language||'en').trim(),outline:p.outline?.length>0||p.acts?.length>0,scenes:Array.isArray(p.scenes)&&p.scenes.length>0,characters:Array.isArray(p.characters),characterMatrix:matrixReady,continuity:continuityReady,structure:structureReady,rights:content.rightsConfirmed===true||content.mediaRightsConfirmed===true};
  return {ready:Object.values(checks).every(Boolean),checks,calculatedAt:now(),version:'KV30-STORY-READINESS-2'};
}

function review(content, previousReview=null){
  const p=content.studioProject||{}; const findings=[];
  const prior=new Map((previousReview?.findings||[]).map(f=>[`${f.messageKey||''}|${JSON.stringify(f.params||{})}`,f]));
  const names=new Set((p.characters||[]).map(c=>String(c.name||'').toLowerCase()).filter(Boolean));
  const used=new Set();
  for(const s of p.scenes||[]){
    const body=String(s.body||'').toLowerCase();
    for(const n of names) if(body.includes(n)) used.add(n);
  }
  const addFinding=(f)=>{
    const key=`${f.messageKey||''}|${JSON.stringify(f.params||{})}`;
    const old=prior.get(key);
    findings.push({...f,id:String(old?.id||id('FND')),status:['open','acknowledged','resolved'].includes(old?.status)?old.status:'open',updatedAt:now()});
  };
  for(const n of names) if(!used.has(n)) addFinding({kind:'character_consistency',severity:'info',messageKey:'storyFindingCharacterUnreferenced',params:{character:n}});
  if((p.beats||[]).some(b=>!b.sceneId)) addFinding({kind:'continuity',severity:'warning',messageKey:'storyFindingBeatsUnlinked'});
  if((p.scenes||[]).some(s=>!s.actId)) addFinding({kind:'structure',severity:'warning',messageKey:'storyFindingScenesUnlinked'});
  if(!p.cover) addFinding({kind:'publishing',severity:'info',messageKey:'storyFindingCoverMissing'});
  const open=findings.filter(f=>f.status!=='resolved');
  return {id:id('REVW'),storyId:content.id,createdAt:now(),engine:'KV30-Story-Review-Local',findings,summary:{findingCount:findings.length,openCount:open.length,resolvedCount:findings.length-open.length},decision:findings.some(f=>f.severity==='warning'&&f.status!=='resolved')?'review':'advisory'};
}

function updateReviewFinding({content,user,maps,findingId,status,audit}){
  requireCollaborator(user,content,maps.collaborators||new Map(),['owner','editor','reviewer']);
  const allowed=new Set(['open','acknowledged','resolved']);
  if(!allowed.has(String(status))) throw new Error('story_review_status_invalid');
  const reviewRow=maps.storyReviews?.get(content.id);
  if(!reviewRow) throw new Error('story_review_not_found');
  const finding=reviewRow.findings?.find(f=>String(f.id)===String(findingId));
  if(!finding) throw new Error('story_review_finding_not_found');
  finding.status=String(status); finding.updatedAt=now(); finding.updatedBy=String(user.id);
  const open=reviewRow.findings.filter(f=>f.status!=='resolved');
  reviewRow.summary={findingCount:reviewRow.findings.length,openCount:open.length,resolvedCount:reviewRow.findings.length-open.length};
  reviewRow.decision=reviewRow.findings.some(f=>f.severity==='warning'&&f.status!=='resolved')?'review':'advisory';
  maps.storyReviews.set(content.id,reviewRow); maps.persistence?.();
  audit?.({actor:user.id,action:'story_review_finding_updated',resourceType:'story',resourceId:content.id,result:'updated',metadata:{findingId:String(findingId),status:String(status)}});
  return {ok:true,review:clone(reviewRow),finding:clone(finding)};
}

module.exports={normalizeProject,validateProject,saveStory,autosave,restoreRevision,grant,listCollaborators,updateCollaborator,revokeCollaborator,collaborationRole,requireCollaborator,setMedia,setCover,saveCharacterMatrix,saveContinuity,saveTranslationDraft,listTranslationDrafts,removeCharacter,publishingChecklist,readiness,review,updateReviewFinding,MAX,ROLES};
