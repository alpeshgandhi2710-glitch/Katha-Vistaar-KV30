const fs=require('fs'), path=require('path'), assert=require('assert');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const keys=['addSticker','addOffer','addAdCampaign','eventsCalendar','loading','outline','aiWriter','voiceToWrite','translation','panels','dialogue','assets','episodes','transcript','voicePlan','aiScript'];
for(const k of keys) assert(app.includes(`x('${k}')`),`missing governed key ${k}`);
for(const literal of ['>Add sticker<','>Add offer<','>Add ad campaign<','<h1>Events Calendar</h1>','<div class="loading-card">Loading…</div>','>Outline<','>AI Writer<','>Voice-to-Write<','>Translation<','>Panels<','>Dialogue<','>Assets<','>Episodes<','>Transcript<','>Voice Plan<','>AI Script<']) assert(!app.includes(literal),`hardcoded literal remains ${literal}`);
console.log(`PASS R8 governed studio catalog: ${keys.length}/${keys.length}`);
