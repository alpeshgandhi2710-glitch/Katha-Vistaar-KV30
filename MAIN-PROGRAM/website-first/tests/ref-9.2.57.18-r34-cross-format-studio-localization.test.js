const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
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
const en=JSON.parse(fs.readFileSync(path.join(root,'public/locales/en.json'),'utf8')).translations;
const required=['differentTargetFormat','proposalReady','draftCreated','openDraft','localModelRequired','addTextBeforeAiVoice','aiVoiceReadyApproval','aiPlanReadyApproval','saveDraftBeforeStudio','studioProjectSaved','creatorApprovalRecorded','createDraftAction'];
for(const k of required){if(!(k in en))throw new Error('missing English governed key '+k);console.log('PASS English key '+k)}
const forbidden=['Choose a different target format.','Proposal ready.','Draft created.','Open draft','A local model is required for natural-language draft creation; no fake draft was created.','Add text before generating AI Voice.','AI Voice ready and playing. Creator approval required before attaching/publishing.','AI plan ready — creator approval required.','Save the draft once before saving the studio project.','Studio project saved.','creator approval recorded.'];
for(const lit of forbidden){if(runtimeApp.includes("'"+lit+"'")||runtimeApp.includes('"'+lit+'"'))throw new Error('hardcoded literal remains: '+lit);console.log('PASS governed literal '+lit)}
console.log('R34 cross-format/studio localization governance PASS');
