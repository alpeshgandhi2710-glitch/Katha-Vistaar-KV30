'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const CONFIG_PATH=path.join(__dirname,'..','config','comic-lora-external-service-v30.json');
const CONFIG=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
function baseUrl(endpoint){return String(endpoint||'').trim().replace(/\/$/,'');}
function authHeaders(apiKey){return apiKey?{Authorization:`Bearer ${apiKey}`}:{ };}
function jsonBytes(value){return Buffer.byteLength(JSON.stringify(value||{}),'utf8');}
function assertString(v,name,max){const s=String(v??'').trim();if(!s||s.length>max)throw Object.assign(new Error(`${name}_invalid`),{code:`${name}_invalid`});return s;}
function validateRights(rights={}){
 for(const key of CONFIG.rightsContract.fields){if(rights[key]!==true)throw Object.assign(new Error(`comic_lora_${key}_required`),{code:`comic_lora_${key}_required`});}
 return true;
}
function findLoraNodes(workflow){
 return Object.entries(workflow||{}).filter(([,node])=>node&&typeof node==='object'&&CONFIG.workflowContract.acceptedLoRANodes.includes(String(node.class_type||'')));
}
function validateWorkflow(workflow,loraName){
 if(!workflow||typeof workflow!=='object'||Array.isArray(workflow))throw Object.assign(new Error('comic_lora_workflow_invalid'),{code:'comic_lora_workflow_invalid'});
 if(jsonBytes(workflow)>CONFIG.workflowContract.maxWorkflowBytes)throw Object.assign(new Error('comic_lora_workflow_too_large'),{code:'comic_lora_workflow_too_large'});
 const nodes=findLoraNodes(workflow);if(CONFIG.workflowContract.requiredLoRA&&!nodes.length)throw Object.assign(new Error('comic_lora_lora_node_required'),{code:'comic_lora_lora_node_required'});
 const target=assertString(loraName,'comic_lora_name',CONFIG.workflowContract.maxLoRANameChars);
 let found=false;
 for(const [,node] of nodes){const name=String(node.inputs?.lora_name||node.inputs?.lora||'');if(name===target){found=true;break;}}
 if(!found)throw Object.assign(new Error('comic_lora_name_not_bound_to_workflow'),{code:'comic_lora_name_not_bound_to_workflow'});
 return {workflow,nodes:nodes.map(([id,node])=>({id,classType:node.class_type,loraName:String(node.inputs?.lora_name||node.inputs?.lora||'')})),loraName:target};
}
async function requestJson({endpoint,apiKey,pathName,method='GET',payload,timeoutMs=8000}={}){
 const url=baseUrl(endpoint)+pathName;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(500,Number(timeoutMs)||8000));
 try{
  const headers={'Content-Type':'application/json',...authHeaders(apiKey)};
  const r=await fetch(url,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload),signal:controller.signal});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,2000)}};
  if(!r.ok)throw Object.assign(new Error(`comic_lora_provider_http_${r.status}`),{code:`comic_lora_provider_http_${r.status}`,status:r.status,data});
  return data;
 }catch(e){if(e.name==='AbortError')throw Object.assign(new Error('comic_lora_provider_timeout'),{code:'comic_lora_provider_timeout'});throw e;}
 finally{clearTimeout(timer);}
}
async function health({endpoint,apiKey,timeoutMs=5000}={}){
 const data=await requestJson({endpoint,apiKey,pathName:CONFIG.healthPath,timeoutMs});
 return {ok:true,provider:CONFIG.provider,health:data};
}
async function submit({endpoint,apiKey,workflow,clientId,promptId,timeoutMs=12000}={}){
 const id=String(promptId||crypto.randomUUID());
 const data=await requestJson({endpoint,apiKey,pathName:CONFIG.promptPath,method:'POST',payload:{prompt:workflow,client_id:String(clientId||crypto.randomUUID()),prompt_id:id},timeoutMs});
 const providerJobId=String(data.prompt_id||id);
 return {ok:true,provider:CONFIG.provider,providerJobId,queue:data.number??null,nodeErrors:data.node_errors||null,raw:data};
}
async function history({endpoint,apiKey,promptId,timeoutMs=8000}={}){
 const id=assertString(promptId,'prompt_id',120);
 const data=await requestJson({endpoint,apiKey,pathName:CONFIG.historyPath.replace('{promptId}',encodeURIComponent(id)),timeoutMs});
 const row=data[id]||data;
 return {ok:true,promptId:id,history:row};
}
function outputSummary(historyRow){
 const outputs=historyRow?.outputs&&typeof historyRow.outputs==='object'?historyRow.outputs:{};
 const rows=[];
 for(const [nodeId,nodeOut] of Object.entries(outputs)){
  for(const image of Array.isArray(nodeOut?.images)?nodeOut.images:[])rows.push({type:'image',nodeId,filename:String(image.filename||''),subfolder:String(image.subfolder||''),folderType:String(image.type||'output')});
  for(const video of Array.isArray(nodeOut?.videos)?nodeOut.videos:[])rows.push({type:'video',nodeId,filename:String(video.filename||''),subfolder:String(video.subfolder||''),folderType:String(video.type||'output')});
  for(const text of Array.isArray(nodeOut?.text)?nodeOut.text:[])rows.push({type:'text',nodeId,text:String(text).slice(0,4000)});
 }
 return rows;
}
async function poll({endpoint,apiKey,promptId,intervalMs=750,timeoutMs=120000}={}){
 const start=Date.now();let last=null;
 while(Date.now()-start<Math.max(1000,Number(timeoutMs)||120000)){
  last=await history({endpoint,apiKey,promptId});
  const row=last.history||{};
  if(row.status?.completed===true||row.status?.status_str==='success'||row.outputs){return {...last,completed:true,outputs:outputSummary(row)};}
  if(row.status?.status_str==='error'||row.status?.status_str==='failed')throw Object.assign(new Error('comic_lora_provider_execution_failed'),{code:'comic_lora_provider_execution_failed',history:row});
  await new Promise(r=>setTimeout(r,Math.max(100,Number(intervalMs)||750)));
 }
 throw Object.assign(new Error('comic_lora_provider_poll_timeout'),{code:'comic_lora_provider_poll_timeout',last});
}
function viewUrl({endpoint,filename,subfolder='',folderType='output'}={}){
 const u=new URL(baseUrl(endpoint)+CONFIG.viewPath+'/');u.searchParams.set('filename',String(filename||''));u.searchParams.set('subfolder',String(subfolder||''));u.searchParams.set('type',String(folderType||'output'));return u.toString();
}
module.exports={CONFIG,validateRights,validateWorkflow,health,submit,history,poll,viewUrl,outputSummary};
