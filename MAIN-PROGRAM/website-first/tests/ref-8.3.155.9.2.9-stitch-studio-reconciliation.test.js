const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
const p=JSON.parse(fs.readFileSync(path.join(root,'config/studio-capability-profile-v30.json'),'utf8'));
const {studioProjectValid,STUDIO_DEFAULTS}=require('../src/server');
test('REF-8.3.155.9.2.9 reconciled Stitch studio capabilities are represented without runtime dependency',()=>{
 assert.equal(p.runtimeDependency,'none');assert.ok(p.comic.authoring.includes('speech_bubbles'));assert.ok(p.comic.authoring.includes('kerning'));assert.ok(p.audio.authoring.includes('multi_track'));assert.ok(p.audio.authoring.includes('loudness_target'));assert.ok(p.reel.authoring.includes('keyframes'));assert.ok(p.reel.authoring.includes('speed_ramp'));assert.ok(STUDIO_DEFAULTS.comic.capabilities.includes('halftone_60l'));assert.ok(STUDIO_DEFAULTS.audio.capabilities.includes('sidechain_ducking'));assert.ok(STUDIO_DEFAULTS.reel.capabilities.includes('fps_60'));
 assert.equal(studioProjectValid('comic',{pages:[{page:1,panels:[{x:1,y:2,w:40,h:30,speechBubbles:[{text:'नमस्ते',language:'hi',type:'speech',kerning:0.01}]}]}],dpi:600,printPreset:'pdf_x4'}),true);
 assert.equal(studioProjectValid('audio',{episodes:[{episode:1,tracks:[{startMs:0,endMs:1000,gainDb:-3,pan:0,effects:['eq','compressor']}]}],sampleRate:'48000',bitDepth:'24',loudnessTarget:-14,truePeak:-1}),true);
 assert.equal(studioProjectValid('reel',{clips:[{order:1,duration:5,speed:0.5,keyframes:[{frame:0,easing:'linear'},{frame:30,easing:'elastic-snap'}],captions:[{start:0,end:2,text:'Hello'}]}],fps:60,resolution:'2160x3840',aspectRatio:'9:16',safeZones:{top:140,right:120,bottom:260}}),true);
});
