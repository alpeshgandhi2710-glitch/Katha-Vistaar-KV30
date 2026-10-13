const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const app=source;
const runtime=source.slice(source.indexOf('function '));
const locales=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
const keys=['analytics','audienceInsights','contentPerformance','forYou'];
for(const loc of locales){
  const blockRe=new RegExp('Object\\.assign\\(extra\\.'+loc+'\\,\\{[^}]*'+keys.map(k=>k+'\\s*:').join('.*'),'s');
  if(!blockRe.test(app)) throw new Error('R11 locale coverage missing '+loc);
}
for(const k of keys) if(!new RegExp('\\b'+k+'\\s*:').test(app)) throw new Error('R11 missing key '+k);
for(const lit of ['>Analytics<','>Audience Insights<','>Content Performance<','>For You<']) if(runtime.includes(lit)) throw new Error('R11 literal remains '+lit);
console.log('PASS REF-9.2.57.18-R11: 4 analytics/discovery keys x 23 locales; UI headings governed');
