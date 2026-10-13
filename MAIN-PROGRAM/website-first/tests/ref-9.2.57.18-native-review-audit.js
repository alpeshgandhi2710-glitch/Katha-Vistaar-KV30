const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
function balanced(start){const open=src[start],close=open==='{'?'}':']';let d=0,q=null,e=false;for(let i=start;i<src.length;i++){const c=src[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c===open)d++;else if(c===close){if(--d===0)return src.slice(start,i+1);}}throw new Error('unbalanced');}
function obj(name){const p=src.indexOf(`const ${name}=`);assert(p>=0,`${name} missing`);const st=src.indexOf('{',p);return vm.runInNewContext(`(${balanced(st)})`,{});}
const T=obj('T'),extra=obj('extra');
for(const m of src.matchAll(/Object\.assign\(extra\.([A-Za-z0-9_]+),/g)){const lang=m[1],st=src.indexOf('{',m.index);Object.assign(extra[lang]||(extra[lang]={}),vm.runInNewContext(`(${balanced(st)})`,{}));}
const languages=Object.keys(T);const used=new Set();for(const m of src.matchAll(/\b(?:t|x)\(\s*['"]([^'"]+)['"]\s*\)/g))used.add(m[1]);
const rows=[];let fallback=0;
for(const lang of languages){let direct=0,missing=[];for(const key of used){const v=(T[lang]&&T[lang][key])??(extra[lang]&&extra[lang][key]);if(v!==undefined&&v!==null&&v!=='')direct++;else missing.push(key);}const englishOnly=lang==='en'?0:[...used].filter(k=>{const v=(T[lang]&&T[lang][k])??(extra[lang]&&extra[lang][k]);const en=(T.en&&T.en[k])??(extra.en&&extra.en[k]);return v!==undefined&&v===en;}).length;const fallbackKeys=missing.filter(k=>{const en=(T.en&&T.en[k])??(extra.en&&extra.en[k]);return en!==undefined;});fallback+=fallbackKeys.length;rows.push({lang,direct,total:used.size,missing:missing.length,englishIdentical:englishOnly});}
console.log(JSON.stringify({languages:languages.length,usedKeys:used.size,rows,totalDirectMissing:rows.reduce((a,r)=>a+r.missing,0),englishFallbackExposure:fallback},null,2));
