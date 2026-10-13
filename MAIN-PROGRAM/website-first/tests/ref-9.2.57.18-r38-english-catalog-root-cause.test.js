const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');

function extractBalanced(source,startIndex){
  const open=source[startIndex];
  const close=open==='{'?'}':']';
  let depth=0,quote=null,escaped=false;
  for(let i=startIndex;i<source.length;i++){
    const c=source[i];
    if(quote){
      if(escaped) escaped=false;
      else if(c==='\\') escaped=true;
      else if(c===quote) quote=null;
      continue;
    }
    if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
    if(c===open) depth++;
    if(c===close){
      depth--;
      if(depth===0) return source.slice(startIndex,i+1);
    }
  }
  throw new Error('unbalanced object');
}

function extractConstObject(name){
  const marker=new RegExp(`const\\s+${name}\\s*=`);
  const match=marker.exec(app);
  assert(match,`${name} declaration missing`);
  const start=app.indexOf('{',match.index+match[0].length);
  return vm.runInNewContext(`(${extractBalanced(app,start)})`,{});
}

const T=extractConstObject('T');
const extra=extractConstObject('extra');
const fallback=T.en;

// Reproduce the runtime's R31 governed multilingual source merge.
const R31_UI=extractConstObject('R31_UI');
for(const [key,values] of Object.entries(R31_UI)){
  for(const [lang,value] of Object.entries(values)){
    if(extra[lang]) extra[lang][key]=value;
  }
}

// Reproduce every later Object.assign(extra.xx,{...}) block with balanced parsing.
let cursor=0;
while(true){
  const marker=app.indexOf('Object.assign(extra.',cursor);
  if(marker<0) break;
  const langStart=marker+'Object.assign(extra.'.length;
  const comma=app.indexOf(',',langStart);
  const lang=app.slice(langStart,comma).trim();
  const objectStart=app.indexOf('{',comma+1);
  const objectSource=extractBalanced(app,objectStart);
  const closeParen=app.indexOf(');',objectStart+objectSource.length);
  assert(closeParen>=0,`Object.assign close missing for ${lang}`);
  const additions=vm.runInNewContext(`(${objectSource})`,{});
  extra[lang]=Object.assign(extra[lang]||{},additions);
  cursor=closeParen+2;
}

function localeValue(lang,key){
  return extra[lang]?.[key] ?? T[lang]?.[key] ?? fallback?.[key];
}

const evidencedValues={
  act:'Act',acts:'Acts',addAct:'AddAct',addBeat:'AddBeat',addCharacter:'AddCharacter',addScene:'Add a scene.',
  beat:'Beat',beats:'Beats',canonicalFacts:'CanonicalFacts',character:'Character',characters:'Characters',continuity:'Continuity',
  creatorApproval:'CreatorApproval',missions:'Missions',openThreads:'OpenThreads',premise:'Premise',publishingReadiness:'PublishingReadiness',
  readers:'Readers',scenes:'Scenes',secure:'Secure',
  sponsoredMediaPolicy:'Sponsored media. Ad controls are governed by the active subscription/ad policy.',
  supportCreatorsExplore:'Support creators · Explore more',works:'Works',
  addOutlinePoint:'Add outline point',addTextBeforeAiVoice:'Add text before generating AI Voice.',aiFm:'AI FM',
  aiPlanReadyApproval:'AI plan ready — creator approval required.',aiProposalReady:'AI proposal ready.',aiStory:'AI Story',aiVoice:'AI Voice',
  aiVoiceReadyApproval:'AI Voice ready and playing. Creator approval required before attaching/publishing.',check:'Check',createDraftAction:'Create Draft',
  creatorAiTools:'Creator AI tools',creatorApprovalRecorded:'creator approval recorded.',crossFormat:'Cross-format',differentTargetFormat:'Choose a different target format.',
  draftCreated:'Draft created.',humanApprovalRequired:'Human approval is required; no automatic publish/apply.',loadingEllipsis:'Loading…',
  localModelRequired:'A local model is required for natural-language draft creation; no fake draft was created.',map:'Map',noOutlineYet:'No outline yet.',
  noPublicWorksYet:'No public works yet.',openDraft:'Open draft',pacing:'Pacing',proposalReady:'Proposal ready.',
  saveDraftBeforeStudio:'Save the draft once before saving the studio project.',sourceLanguage:'Source language',storyOutline:'Story outline',
  studioAdvisoryNote:'Rich text, voice-to-write, translation and AI assistance remain advisory. Nothing publishes without creator action.',studioProjectSaved:'Studio project saved.',
  suggest:'Suggest',targetLanguage:'Target language',transform:'Transform',voice:'Voice',writingWorkflow:'Writing workflow',
  aiDraftReviewRequired:'Internal AI created a draft scaffold. Review and approve it yourself; AI cannot publish it.',
  aiProposalApprovalRequired:'AI proposes first; creator approval is required before applying or publishing.',allow:'Allow',audioAdvertisement:'Audio advertisement',
  audioSmartDescription:'Turn stories into FM scripts, narration and timed audio',comicSmartDescription:'Turn stories into panels, dialogue and visual continuity',
  internalIntelligence:'Internal Intelligence',languagesInternalFirst:'23 LANGUAGES · INTERNAL-FIRST',listeningSpeakNow:'Listening… speak now.',
  noPublicPostsYet:'No public posts are available yet.',noPublicUpdatesYet:'No public updates are available yet.',reelSmartDescription:'Turn stories, comics or FM into scenes, shots and captions',
  smartCreationReadingHub:'Smart Creation & Reading Hub',smartHubDescription:'One governed internal-AI workspace for creating, translating, speaking and transforming across Story, Comic, FM and Reel.',
  sticker:'Sticker',stickerPurchased:'Sticker purchased.',storySmartDescription:'Write, translate, speak or transform stories',videoAdvertisement:'Video advertisement',
  voiceInputError:'Voice input error',voiceToTextUnavailable:'Voice-to-text is not available in this browser; use the keyboard microphone if your device provides it.'
};

for(const [key,value] of Object.entries(evidencedValues)){
  assert.strictEqual(localeValue('en',key),value,`English source drift/missing: ${key}`);
}

// R31 source-level multilingual key must remain backed by its existing reviewed values.
for(const [lang,values] of Object.entries(R31_UI)){
  assert.strictEqual(localeValue(lang,'masterAdmin'),values.masterAdmin,`R31 masterAdmin drift: ${lang}`);
}

// Regression guard: old malformed reverse alias must never return.
assert.strictEqual(extra.en['Acts'],undefined,'old reverse alias must not be restored');
assert.strictEqual(extra.en['Works'],undefined,'old reverse alias must not be restored');
assert.strictEqual(extra.en.acts,'Acts');
assert.strictEqual(extra.en.works,'Works');
assert.strictEqual(extra.en.supportCreatorsExplore,'Support creators · Explore more');
assert.strictEqual(extra.en.sponsoredMediaPolicy,'Sponsored media. Ad controls are governed by the active subscription/ad policy.');

console.log(`R38 English catalog root-cause correction: ${Object.keys(evidencedValues).length}/${Object.keys(evidencedValues).length} PASS`);
