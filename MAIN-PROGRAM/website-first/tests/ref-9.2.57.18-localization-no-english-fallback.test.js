const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
assert(src.includes('function xStrict('),'xStrict missing');
assert(fs.existsSync(path.join(__dirname,'..','config','ui-localization-governance-v30.json')),'localization governance missing');
function balanced(start){const open=src[start],close=open==='{'?'}':']';let d=0,q=null,e=false;for(let i=start;i<src.length;i++){const c=src[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c===open)d++;else if(c===close){if(--d===0)return src.slice(start,i+1);}}throw new Error('unbalanced');}
function obj(name){const p=src.indexOf(`const ${name}=`);assert(p>=0,`${name} missing`);const st=src.indexOf('{',p);return vm.runInNewContext(`(${balanced(st)})`,{});}
const T=obj('T'),extra=obj('extra');
for(const m of src.matchAll(/Object\.assign\(extra\.([A-Za-z0-9_]+),/g)){const lang=m[1],st=src.indexOf('{',m.index);Object.assign(extra[lang]||(extra[lang]={}),vm.runInNewContext(`(${balanced(st)})`,{}));}
const keys=['coins','continueReadingTitle','enterTrainingTopic','madeForIndia','none','openLibrary','pages','productKeyPrompt','registeredContact','scene','sponsored','trainingAi','trainingLanguage','trainingPreparing','trainingTopic','trainingTopicPlaceholder','trainingUnavailable','yourLibrary'];
const languages=Object.keys(T);assert.strictEqual(languages.length,23,'canonical UI language count must be 23');
for(const lang of languages){for(const key of keys){const value=(T[lang]&&T[lang][key])??(extra[lang]&&extra[lang][key]);assert(value!==undefined&&value!==null&&value!=='',`${lang}:${key} missing`);}}
assert.match(src,/function xStrict\(key,lang=state\.uiLanguage\)[\s\S]*?if\(v==null\|\|String\(v\)\.trim\(\)===''\|\|String\(v\)\.trim\(\)===`\[\$\{key\}\]`\)v=localeValue\('en',key\);/,'runtime English fallback contract missing');
console.log(`PASS R40 reconciled localization fallback: ${keys.length} governed keys × ${languages.length} locales; missing/empty/placeholder values use English fallback.`);
