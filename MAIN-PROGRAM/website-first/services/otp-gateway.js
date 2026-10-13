'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {requestJson}=require('./external-provider-adapter');
const {smtpSend}=require('./otp-smtp');
function envBool(env,k,d=false){const v=String(env[k]??'').trim().toLowerCase();return v?v==='true'||v==='1'||v==='on':d}
function makeOtpGateway({root,services,mailOutbox,env=process.env}={}){
  const cfg=JSON.parse(fs.readFileSync(path.join(root,'config','otp-gateway-v30.json'),'utf8'));
  const internalComms=JSON.parse(fs.readFileSync(path.join(root,'config','internal-communications-v30.json'),'utf8'));
  const internalDomain=()=>String(env.KV_INTERNAL_MAIL_DOMAIN||internalComms.internalDomain||'kathavistaar.internal').trim().toLowerCase();
  const internalFrom=()=>{const configured=val(cfg.internal.email.fromEnv)||`no-reply@${internalDomain()}`;const at=configured.lastIndexOf('@');if(at<1)return `no-reply@${internalDomain()}`;const domain=configured.slice(at+1).toLowerCase();return domain===internalDomain()?configured:`no-reply@${internalDomain()}`};
  const val=k=>String(env[k]??'').trim();
  const internalEmail=()=>({host:val(cfg.internal.email.hostEnv),port:Number(val(cfg.internal.email.portEnv)||587),secure:envBool(env,cfg.internal.email.secureEnv,false),starttls:envBool(env,cfg.internal.email.starttlsEnv,true),user:val(cfg.internal.email.userEnv),pass:val(cfg.internal.email.passwordEnv),from:internalFrom()});
  const externalEmail=()=>({host:val(cfg.external.email.smtpHostEnv),port:Number(val(cfg.external.email.smtpPortEnv)||587),secure:envBool(env,cfg.external.email.smtpSecureEnv,false),starttls:envBool(env,cfg.external.email.smtpStarttlsEnv,true),user:val(cfg.external.email.smtpUserEnv),pass:val(cfg.external.email.smtpPasswordEnv),from:val(cfg.external.email.smtpFromEnv)||'no-reply@kathavistaar.example'});
  function localized(language,key,fallback){try{const code=String(language||'en').split('-')[0].toLowerCase();const file=path.join(root,'public','locales',code+'.json');const d=JSON.parse(fs.readFileSync(file,'utf8'));return String(d.translations?.[key]??fallback);}catch{return fallback;}}
  async function smtpEmail(c,target,purpose,otp,language='en'){const subject='Katha Vistaar · OTP';const body=localized(language,'otpSent','A verification code has been sent to your registered contact.')+'\n\nOTP: '+String(otp)+'\nPurpose: '+String(purpose)+'\nExpires in 3 minutes.';await smtpSend({...c,to:target,subject,text:body,replyTo:val(internalComms.from.replyToEnv&&env[internalComms.from.replyToEnv])||undefined});return {mode:'smtp',delivered:true,from:c.from,internalDomain:internalDomain()};}
  async function gatewaySms(endpoint,apiKey,target,purpose,otp,id,language='en'){const message=localized(language,'otpSent','A verification code has been sent to your registered contact.')+' OTP: '+String(otp)+'. Expires in 3 minutes.';const r=await requestJson({endpoint,apiKey,payload:{to:target,message,purpose},idempotencyKey:id,retries:2});return {mode:'gateway',delivered:true,providerStatus:r.status};}
  async function deliverInternal({type,target,purpose,otp,row,language='en'}){
    if(type==='email'){const c=internalEmail();if(c.host)return smtpEmail(c,target,purpose,otp,language)}
    if(type==='sms'){const endpoint=val(cfg.internal.sms.endpointEnv),key=val(cfg.internal.sms.apiKeyEnv);if(endpoint)return gatewaySms(endpoint,key,target,purpose,otp,row.id,language)}
    return {mode:'internal_otp_store',delivered:false,internalStored:true};
  }
  async function sendInternalMessage({type,target,subject='Katha Vistaar',text='',category='transactional',row,language='en'}){
    if(type==='email'){
      const c=internalEmail();
      if(!c.host)return {mode:'internal_email_queue',delivered:false,queued:true};
      await smtpSend({...c,to:target,subject,text,replyTo:val(internalComms.from.replyToEnv&&env[internalComms.from.replyToEnv])||undefined});
      return {mode:'smtp',delivered:true,from:c.from,internalDomain:internalDomain(),channel:'email'};
    }
    if(type==='sms'){
      const endpoint=val(cfg.internal.sms.endpointEnv),key=val(cfg.internal.sms.apiKeyEnv);
      if(!endpoint)return {mode:'internal_sms_queue',delivered:false,queued:true,channel:'sms'};
      const r=await requestJson({endpoint,apiKey:key,payload:{to:target,message:String(text||''),category:String(category||'transactional')},idempotencyKey:row?.id||crypto.randomUUID(),retries:2});
      return {mode:'gateway',delivered:true,providerStatus:r.status,channel:'sms'};
    }
    throw Object.assign(new Error('transactional_channel_invalid'),{code:'transactional_channel_invalid'});
  }
  async function deliverExternal({type,target,purpose,otp,row,language='en'}){
    if(type==='email'&&val(cfg.external.email.transportEnv).toLowerCase()==='smtp'&&externalEmail().host)return smtpEmail(externalEmail(),target,purpose,otp,language);
    const endpoint=val(type==='email'?cfg.external.email.httpEndpointEnv:cfg.external.sms.endpointEnv),apiKey=val(type==='email'?cfg.external.email.httpApiKeyEnv:cfg.external.sms.apiKeyEnv);
    if(!endpoint||!apiKey)throw Object.assign(new Error(`external_${type}_gateway_not_configured`),{code:'external_gateway_not_configured'});
    if(type==='sms')return gatewaySms(endpoint,apiKey,target,purpose,otp,row.id);
    const r=await requestJson({endpoint,apiKey,payload:{to:target,subject:'Katha Vistaar · OTP',text:localized(language,'otpSent','A verification code has been sent to your registered contact.')+'\n\nOTP: '+String(otp)+'\nPurpose: '+String(purpose)+'\nExpires in 3 minutes.',purpose},idempotencyKey:row.id,retries:2});return {mode:'gateway',delivered:true,providerStatus:r.status};
  }
  async function deliverInternalOnly({type,target,purpose,otp,row,language='en'}){return deliverInternal({type,target,purpose,otp,row,language});}
  async function deliverExternalOnly({type,target,purpose,otp,row,language='en'}){return deliverExternal({type,target,purpose,otp,row,language});}
  async function deliver({type,target,purpose,otp,row,externalEnabled}){
    if(externalEnabled) throw Object.assign(new Error('external_otp_must_use_service_manager'),{code:'external_otp_must_use_service_manager'});
    return deliverInternalOnly({type,target,purpose,otp,row});
  }
  function issueAutoFillToken(){return crypto.randomBytes(24).toString('base64url');}
  return {deliver,deliverInternalOnly,deliverExternalOnly,sendInternalMessage,issueAutoFillToken,config:cfg};
}
module.exports={makeOtpGateway};
