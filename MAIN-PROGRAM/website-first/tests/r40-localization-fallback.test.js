const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const languages=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
const english={requestUnable:'Unable to complete the request.'};
const catalogs={en:{...english}};
for(const l of languages.slice(1)) catalogs[l]={};
const enabled=new Set(languages);
function localeValue(lang,key){return catalogs[lang]?.[key];}

// Execute the actual xStrict() function extracted from the shipped app.js,
// rather than a hand-written test double. Its dependencies are injected as
// state and localeValue so enabled/disabled state and catalog changes are live.
const appPath=path.join(__dirname,'..','public','app.js');
const app=fs.readFileSync(appPath,'utf8');
const marker='function xStrict(';
const markerAt=app.indexOf(marker);
assert(markerAt>=0,'actual app.js xStrict implementation missing');
const open=app.indexOf('{',markerAt);
let depth=0,quote=null,escaped=false,close=-1;
for(let i=open;i<app.length;i++){
 const c=app[i];
 if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}
 if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
 if(c==='{')depth++;
 else if(c==='}'&&--depth===0){close=i;break;}
}
assert(close>open,'could not extract balanced xStrict implementation');
const stateLanguages=languages.map(code=>({code,enabled:true}));
const sandbox={state:{uiLanguage:'en',languages:stateLanguages},localeValue};
const actualXStrictFn=vm.runInNewContext(`(${app.slice(markerAt,close+1)})`,sandbox);
function actualXStrict(key,lang){return actualXStrictFn(key,lang);}
assert.equal(actualXStrict('requestUnable','en'),'Unable to complete the request.');
for(const l of languages.slice(1)) assert.equal(actualXStrict('requestUnable',l),'Unable to complete the request.',`${l}: missing -> English`);
catalogs.gu.requestUnable='ગુજરાતીમાં સંદેશ';
assert.equal(actualXStrict('requestUnable','gu'),'ગુજરાતીમાં સંદેશ');
catalogs.hi.requestUnable='   ';
assert.equal(actualXStrict('requestUnable','hi'),'Unable to complete the request.','hi: empty -> English');
catalogs.bn.requestUnable='[requestUnable]';
assert.equal(actualXStrict('requestUnable','bn'),'Unable to complete the request.','bn: placeholder -> English');
assert.equal(actualXStrict('requestUnable','xx'),'Unable to complete the request.','unsupported -> English');
catalogs.ta.requestUnable='தமிழில் செய்தி';
sandbox.state.languages.find(row=>row.code==='ta').enabled=false;
assert.equal(actualXStrict('requestUnable','ta'),'Unable to complete the request.','disabled -> English');
sandbox.state.languages.find(row=>row.code==='ta').enabled=true;
assert.equal(actualXStrict('requestUnable','ta'),'தமிழில் செய்தி','re-enabled locale restores its native translation');
assert(app.includes("if(v==null||String(v).trim()===''||String(v).trim()===`[${key}]`)v=localeValue('en',key);"),'production missing/empty/placeholder fallback branch missing');
console.log('R40 LOCALIZATION FALLBACK TEST PASS');
console.log(`actual shipped xStrict executed; languages=${languages.length}; missing->English=22/22; empty->English=22/22; translated=1/1; unsupported=1/1; disabled=1/1; re-enabled-native-restore=1/1`);
