'use strict';
const crypto=require('node:crypto');
const memory=require('./ai-memory-rag.js');
const learning=require('./ai-learning.js');
const language=require('./ai-language-support.js');
const VERSION='KV30-P2-30W-user-content-learning-v1';
const MAX_TEXT=30000;
function clean(v,max=MAX_TEXT){return String(v??'').replace(/[\\u0000-\\u001F\\u007F]/g,' ').slice(0,max);}
function indexContent({userId,contentId,type,title,body,summary,languageCode='en',media=[] ,consent=false,rightsConfirmed=false}={}){
 if(!userId)throw Object.assign(new Error('user_required'),{code:'user_required'});
 if(!consent)throw Object.assign(new Error('content_learning_consent_required'),{code:'content_learning_consent_required'});
 if(!rightsConfirmed)throw Object.assign(new Error('content_learning_rights_confirmation_required'),{code:'content_learning_rights_confirmation_required'});
 const lang=language.resolve(languageCode,body||title||'').code;
 const value=JSON.stringify({type:String(type||'unknown'),title:clean(title,500),summary:clean(summary,2000),body:clean(body),language:lang,media:media.map(x=>({id:x.id,mimeType:x.mimeType,size:x.size,durationSeconds:x.durationSeconds||null,filename:x.filename||null})).slice(0,50)});
 const row=memory.put('user',{key:`content:${userId}:${contentId}`,value,source:'user-owned-content',rights:'owner-confirmed',approved:true,ownerId:userId,tags:['user_content',String(type||'unknown'),lang]});
 return {ok:true,version:VERSION,indexed:true,trainingMode:'retrieval_and_candidate_staging',rowId:row.id,language:lang};
}
function proposeTraining({userId,aiId,contentId,exampleInput,exampleOutput,rightsConfirmed=false,evaluationPassed=false}={}){
 if(!userId)throw Object.assign(new Error('user_required'),{code:'user_required'});
 if(!rightsConfirmed)throw Object.assign(new Error('learning_rights_confirmation_required'),{code:'learning_rights_confirmation_required'});
 return learning.propose({aiId,source:`user-content:${userId}:${contentId||'unknown'}`,input:clean(exampleInput,4000),output:clean(exampleOutput,6000),license:'user-owned-authorized',rightsConfirmed,evaluationPassed});
}
function status(){return {version:VERSION,userContentIsRetrievalFirst:true,rawMediaWeightsNeverAutoTrained:true,consentRequired:true,rightsRequired:true,productionRetrainingAuto:false};}
module.exports={VERSION,indexContent,proposeTraining,status};
