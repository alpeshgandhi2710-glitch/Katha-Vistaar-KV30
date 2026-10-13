'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const codes=['en','hi','gu','mr','bn','ta','te','kn','ml','pa','ur','or','as','mai','sa','kok','brx','sd','ks','mni','doi','sat','ne'];
const required=['storyStudio','acts','scenes','characters','beats','continuity','premise','act','character','beat','addAct','addScene','addCharacter','addBeat','publishingReadiness','creatorApproval','canonicalFacts','openThreads','aiWorking','aiProposalReady','humanApprovalRequired'];
for(const c of codes){const j=JSON.parse(fs.readFileSync(path.join(__dirname,'..','public','locales',c+'.json'),'utf8'));const t=j.translations||{};for(const k of required)assert.ok(t[k],`${c}:${k} missing`);if(c!=='en')for(const k of required)assert.notEqual(t[k],required[k],`${c}:${k} suspicious placeholder`);}
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
function stripCatalogDefinitions(source){
  const re=/Object\.assign\(extra\.[A-Za-z0-9_]+,/g;
  let out='',cursor=0,m;
  while((m=re.exec(source))){
    const open=source.indexOf('{',m.index+m[0].length);
    if(open<0){out+=source.slice(cursor);break;}
    let depth=0,quote=null,escaped=false,end=-1;
    for(let i=open;i<source.length;i++){const c=source[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}if(c==='\"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0){end=i;break;}}}
    if(end<0){out+=source.slice(cursor);break;}
    const semi=source.indexOf(';',end);
    out+=source.slice(cursor,m.index); cursor=semi>=0?semi+1:end+1; re.lastIndex=cursor;
  }
  return out+source.slice(cursor);
}
const runtimeApp=stripCatalogDefinitions(app);
const storyBlock=runtimeApp.slice(runtimeApp.indexOf("if(type==='story')"),runtimeApp.indexOf("if(type==='comic')",runtimeApp.indexOf("if(type==='story')")));
for(const lit of ['Story Studio','<h4>Acts</h4>','<h4>Characters</h4>','<h4>Beats</h4>','<h4>Continuity</h4>','Add an act.','Add a scene.','Add a character.','Add a beat.','Publishing Readiness','Creator Approval','Canonical facts','Open threads']) assert.equal(storyBlock.includes(lit),false,`hardcoded rendered studio literal remains: ${lit}`);
for(const lit of ['Internal AI is preparing a governed proposal…','AI proposal ready.','Human approval required; no automatic publish/apply.']) assert.equal(runtimeApp.includes(lit),false,`hardcoded AI status literal remains: ${lit}`);
console.log(`PASS R27 studio localization batch: ${codes.length}/23 locale bundles contain ${required.length} governed studio/status keys; targeted rendered hardcoded literals removed`);
