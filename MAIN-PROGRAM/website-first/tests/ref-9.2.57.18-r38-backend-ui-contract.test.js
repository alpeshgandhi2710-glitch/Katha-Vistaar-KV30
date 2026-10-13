const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const files=['src/services/internal-ads.js','src/services/story-studio.js','src/services/content-access-policy.js','src/services/ai-internal-inference.js','src/services/ai-language-support.js'];
test('R38 backend user-facing output is localization-key governed',()=>{
 const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(ROOT,'..','backend',f),'utf8')]));
 assert.match(src['src/services/internal-ads.js'],/titleKey:'internalAdExploreKatha'/);assert.match(src['src/services/internal-ads.js'],/bodyKey:'internalAdExploreKathaBody'/);
 assert.doesNotMatch(src['src/services/internal-ads.js'],/title:'Explore Katha Vistaar'|body:'Discover stories/);
 assert.match(src['src/services/story-studio.js'],/messageKey:'storyFindingCharacterUnreferenced'/);assert.match(src['src/services/story-studio.js'],/messageKey:'storyFindingBeatsUnlinked'/);assert.match(src['src/services/story-studio.js'],/messageKey:'storyFindingScenesUnlinked'/);assert.match(src['src/services/story-studio.js'],/messageKey:'storyFindingCoverMissing'/);assert.doesNotMatch(src['src/services/story-studio.js'],/message:`Character|message:'One or more/);
 assert.match(src['src/services/content-access-policy.js'],/messageKey:'gstSacMonetizationBlocked'/);assert.doesNotMatch(src['src/services/content-access-policy.js'],/message:'GST\/SAC production matrix/);
 assert.match(src['src/services/ai-internal-inference.js'],/localize\(lang\.code,'aiReady'\)/);assert.match(src['src/services/ai-internal-inference.js'],/localize\(lang\.code,'reviewRequired'\)/);
 console.log('PASS backend user-facing outputs use governed localization keys');
});
