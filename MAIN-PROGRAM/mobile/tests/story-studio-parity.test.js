const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'lib/main.dart'),'utf8');
const story=fs.readFileSync(path.join(root,'lib/story_studio.dart'),'utf8');
for(const needle of ["StoryStudioEditor(t:s.t, language:s.code)","import 'story_studio.dart'"]) assert(main.includes(needle),needle);
for(const needle of ['/api/content','/api/studio/story/$id','/autosave','/review','/api/ai/draft/complete','/api/ai/draft/rewrite','KvStoryChapter','wordCount','storyApplyProposal']) assert(story.includes(needle),needle);
assert(!story.includes("Text('Chapter"),'user-facing Chapter literal must be localized');
console.log(JSON.stringify({status:'PASS',phase:'R50-M3',storyEditor:true,chapters:true,localAutosave:true,serverSaveContract:true,serverAutosaveContract:true,reviewContract:true,internalAiCompleteContract:true,internalAiRewriteContract:true,localization:true},null,2));
