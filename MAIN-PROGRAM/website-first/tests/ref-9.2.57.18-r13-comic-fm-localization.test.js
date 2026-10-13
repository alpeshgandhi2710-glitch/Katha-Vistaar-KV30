const fs=require('fs');
const assert=require('assert');
const app=fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');
const langs=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
const keys=['addPage','addPanel','speechBalloon','addCaption','layers','aiLayout','exportPng','dpi','printPreset','screen','pngMaster','pdfx4Metadata','printMaster','halftone','perspective3pt','warpMesh','balloonType','speech','shout','thought','narration','kerning','shirorekha','dragSave','addPanelPrompt','sampleRate','bitDepth','lufsTarget','truePeak','sidechainDuck','addEpisode','addSegment','loadWaveform','renderMix','audioWaveform','ready','createEpisodePrompt','mixSourceAudio','audioUploadHint','uploadAudioFirst','selectAudioAsset','mixRendered','comicPage','panelsCount','sceneLabel','dialoguePlaceholder','clip','trimSelected','renderMp4','reelPreview','addClipPrompt','renderSourceVideo','videoUploadHint','uploadVideoFirst','renderedSuccess'];
for(const lang of langs){
  const re=new RegExp(`Object\\.assign\\(extra\\.${lang}\\,\\{[\\s\\S]*?\\}\\);`,'g');
  const blocks=app.match(re)||[];
  const block=blocks.find(b=>keys.some(k=>b.includes(`"${k}"`)))||'';
  assert(block,`missing R13 locale catalog block: ${lang}`);
  for(const k of keys) assert(block.includes(`"${k}"`),`${lang} missing ${k}`);
}
const studio=app.slice(app.indexOf("}else if(type==='comic')"),app.indexOf("}else if(type==='reel')"));
for(const raw of ['Add Page','Speech Balloon','AI Layout','Export PNG','Print preset','Halftone','3-pt Perspective','Warp/Mesh','Balloon type','Dialogue','Load Real Waveform','Render Mix','Sample rate','Bit depth','LUFS target','True peak','Sidechain duck']) assert(!new RegExp('(?:>|placeholder=\"|aria-label=\")'+raw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(studio),`hardcoded studio label remains: ${raw}`);
console.log(`PASS REF-9.2.57.18-R13: Comic + FM/Audio governed catalog ${keys.length} keys x ${langs.length} locales; targeted hardcoded labels converted`);
