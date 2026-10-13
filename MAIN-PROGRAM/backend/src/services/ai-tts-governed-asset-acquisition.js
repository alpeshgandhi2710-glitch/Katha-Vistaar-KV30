'use strict';
// Governed, checksum-pinned model asset acquisition. No network call is made unless
// the Master Admin transfer switch AND the live internet service/two-sided firewall pass.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const https=require('node:https');
const ROOT=path.resolve(__dirname,'../../../website-first');
const SOURCE_FILE=path.join(ROOT,'config','tts-approved-asset-sources-v30.json');
const ACCESS=require('./ai-tts-training-access-control.js');
const FIREWALL=require('./external-gate-firewall.js');
const {createServiceManager}=require(path.join(ROOT,'services','service-manager.js'));
function readConfig(){return JSON.parse(fs.readFileSync(SOURCE_FILE,'utf8'));}
function sha256File(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function safeAssetId(v){return /^[a-z0-9][a-z0-9._-]{2,100}$/i.test(String(v||''));}
function acquire(assetId,{actorRole='unknown',destinationDir=path.join(ROOT,'data','tts-assets'),maxBytes}={}){
  if(actorRole!=='master_admin')return {ok:false,reason:'master_admin_required_for_tts_asset_acquisition'};
  if(!safeAssetId(assetId))return {ok:false,reason:'tts_asset_id_invalid'};
  const cfg=readConfig(),src=(cfg.sources||[]).find(x=>x.id===assetId);
  if(!src)return {ok:false,reason:'tts_asset_source_not_approved'};
  if(src.approved!==true||src.licenseApproved!==true||!src.licenseEvidence||!src.intendedUse)return {ok:false,reason:'tts_asset_license_approval_missing'};
  const url=new URL(String(src.url||''));
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')return {ok:false,reason:'tts_asset_source_url_invalid'};
  if(!/^[a-f0-9]{64}$/i.test(String(src.sha256||'')))return {ok:false,reason:'tts_asset_sha256_invalid'};
  const allowedHosts=Array.isArray(src.allowedHosts)?src.allowedHosts.map(String):[];
  if(!allowedHosts.includes(url.hostname))return {ok:false,reason:'tts_asset_host_not_allowlisted'};
  const state=ACCESS.status();
  if(!state.externalModelDownloadEnabled)return {ok:false,reason:'tts_external_model_download_disabled_by_master_admin'};
  const manager=createServiceManager(ROOT);
  const internet=manager.get('internet_access');
  if(!internet?.enabled)return {ok:false,reason:'master_admin_internet_access_service_off_or_unhealthy'};
  const fw=FIREWALL.authorizeTwoSided({gateId:'service_gate_reserved_01',serviceId:'internet_access',externalEnabled:true,serviceSwitchActive:true,actor:'master_admin',input:`TTS asset acquisition ${assetId}`,idempotencyKey:`tts-asset:${assetId}:${src.sha256}`,timeoutMs:cfg.policy?.timeoutMs||120000});
  if(!fw.ok)return {ok:false,reason:'tts_asset_external_firewall_denied',firewall:fw};
  const auth=ACCESS.authorizeTransfer({direction:'download',actorRole,externalLayerEnabled:true,externalGateApproved:true,pinnedSource:true,sha256:src.sha256,licenseReviewed:true});
  if(!auth.ok)return auth;
  const limit=Math.min(Number(maxBytes||cfg.policy?.maxAssetBytes||0),Number(cfg.policy?.maxAssetBytes||0));
  if(!Number.isSafeInteger(limit)||limit<=0)return {ok:false,reason:'tts_asset_size_limit_invalid'};
  fs.mkdirSync(destinationDir,{recursive:true});
  const dest=path.resolve(destinationDir,`${assetId}.asset`);
  if(!dest.startsWith(path.resolve(destinationDir)+path.sep))return {ok:false,reason:'tts_asset_destination_invalid'};
  const temp=`${dest}.${process.pid}.part`;
  return new Promise(resolve=>{
    let settled=false,total=0;const hash=crypto.createHash('sha256');
    const finish=(result)=>{if(settled)return;settled=true;try{fs.closeSync(fd);}catch{}if(!result.ok)try{fs.unlinkSync(temp);}catch{}resolve(result);};
    let fd;try{fd=fs.openSync(temp,'wx',0o600);}catch(e){return resolve({ok:false,reason:'tts_asset_temp_create_failed',detail:e.code||'io_error'});}
    const req=https.get(url,{timeout:cfg.policy?.timeoutMs||120000,headers:{'User-Agent':'KV30-Governed-TTS-Asset-Acquirer/1.0','Accept':'application/octet-stream'}},res=>{
      if(res.statusCode!==200){res.resume();return finish({ok:false,reason:'tts_asset_http_status_rejected',status:res.statusCode});}
      const length=Number(res.headers['content-length']||0);if(length>limit){res.destroy();return finish({ok:false,reason:'tts_asset_content_length_exceeded'});}
      res.on('data',chunk=>{total+=chunk.length;if(total>limit){res.destroy(new Error('size_limit'));return;}hash.update(chunk);fs.writeSync(fd,chunk);});
      res.on('error',e=>finish({ok:false,reason:e.message==='size_limit'?'tts_asset_size_limit_exceeded':'tts_asset_download_stream_failed'}));
      res.on('end',()=>{const actual=hash.digest('hex');if(actual.toLowerCase()!==String(src.sha256).toLowerCase())return finish({ok:false,reason:'tts_asset_sha256_mismatch',actualSha256:actual,bytes:total});try{fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,dest);finish({ok:true,assetId,bytes:total,sha256:actual,destination:dest,externalUpload:false,automaticPromotion:false});}catch(e){finish({ok:false,reason:'tts_asset_finalize_failed',detail:e.code||'io_error'});}});
    });
    req.on('timeout',()=>req.destroy(new Error('timeout')));
    req.on('error',e=>finish({ok:false,reason:e.message==='timeout'?'tts_asset_download_timeout':'tts_asset_download_failed',detail:String(e.code||e.message||'network_error').slice(0,120)}));
    req.on('response',res=>{if(res.statusCode>=300&&res.statusCode<400){res.destroy();req.destroy(new Error('redirect_blocked'));}});
  });
}
function sourceReadiness(src){
  const reasons=[];
  let url=null;
  try{url=new URL(String(src?.url||''));}catch{reasons.push('source_url_invalid');}
  if(url&&(url.protocol!=='https:'||url.username||url.password||!!url.port&&url.port!=='443'))reasons.push('source_url_policy_invalid');
  const hosts=Array.isArray(src?.allowedHosts)?src.allowedHosts.map(String):[];
  if(!url||!hosts.includes(url.hostname))reasons.push('source_host_not_allowlisted');
  if(src?.approved!==true)reasons.push('source_not_approved');
  if(src?.licenseApproved!==true||!String(src?.licenseEvidence||'').trim()||!String(src?.intendedUse||'').trim())reasons.push('license_or_intended_use_evidence_missing');
  if(!/^[a-f0-9]{64}$/i.test(String(src?.sha256||'')))reasons.push('sha256_pin_invalid');
  return {ready:reasons.length===0,reasons};
}
function status(){
  const cfg=readConfig(),access=ACCESS.status(),manager=createServiceManager(ROOT),internet=manager.get('internet_access');
  const sources=(cfg.sources||[]).map(src=>({id:String(src.id||''),...sourceReadiness(src)}));
  return {version:cfg.version,approvedSources:(cfg.sources||[]).length,externalModelDownloadEnabled:access.externalModelDownloadEnabled,internetGateEnabled:!!internet?.enabled,internetGateHealth:internet?.health||null,policy:cfg.policy,ready:sources.filter(x=>x.ready).length,blockedSources:sources.filter(x=>!x.ready),acquisitionAvailable:access.externalModelDownloadEnabled===true&&!!internet?.enabled&&sources.some(x=>x.ready)};
}
module.exports={acquire,status,sha256File};
