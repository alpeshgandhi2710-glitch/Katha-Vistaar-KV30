const fs=require('fs');
const path=require('path');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const locales=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
const keys=['storyboard','timeline','captions','aiReel','profileUnavailable','unableToLoadProfile','safetyTickets'];
for(const k of keys) if(!new RegExp('\\b'+k+'\\s*:').test(app)) throw new Error('missing key '+k);
for(const loc of locales){ const re=new RegExp('Object\\.assign\\(extra\\.'+loc+'\\,\\{[^}]*'+keys.map(k=>k+'\\s*:').join('.*'),'s'); if(!re.test(app)) throw new Error('locale coverage missing '+loc); }
for(const lit of ['>Profile unavailable<','>Safety & Tickets<']) if(app.includes(lit)) throw new Error('literal remains '+lit);
console.log('PASS REF-9.2.57.18-R9: 7 governed keys x 23 locales; profile/support literals converted');
