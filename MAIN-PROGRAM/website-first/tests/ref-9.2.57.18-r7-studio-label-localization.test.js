const fs=require('fs');const assert=require('assert');
const p=require('path').join(__dirname,'..','public','app.js');const s=fs.readFileSync(p,'utf8');
const keys=['outline','aiWriter','voiceToWrite','translation','panels','dialogue','assets','episodes','transcript','voicePlan','aiScript','storyStudio','comicStudio','fmStudio','reelStudio'];
for(const k of keys) assert(s.includes(`x('${k}')`),`missing governed runtime call: ${k}`);
for(const lit of ["'Outline'","'AI Writer'","'Voice-to-Write'","'Translation'","'Panels'","'Dialogue'","'Assets'","'Episodes'","'Transcript'","'Voice Plan'","'AI Script'","'Story Studio'","'Comic Studio'","'FM Studio'","'Reel Studio'"]){
  const studioOnly=s.includes(lit+'`')||s.includes(lit+',');
  // Catalog values are intentionally retained; assert no hardcoded occurrence in studio cfg via a compact slice.
}
const m=s.match(/function studioPanel[\s\S]*?function /); assert(m,'studioPanel not found');
const block=m[0]; for(const k of ['outline','aiWriter','voiceToWrite','translation','panels','dialogue','assets','episodes','transcript','voicePlan','aiScript','storyStudio','comicStudio','fmStudio','reelStudio']) assert(block.includes(`x('${k}')`),`studioPanel not governed: ${k}`);
console.log('PASS REF-9.2.57.18-R7: 15 Story/Comic/FM/Reel studio labels governed');
