const crypto=require('node:crypto');
const services={email:'KV_EMAIL_API_KEY',sms:'KV_SMS_API_KEY',whatsapp:'KV_WHATSAPP_API_KEY',push:'KV_PUSH_API_KEY',payments:'KV_PAYMENT_SECRET',payouts:'KV_PAYOUT_API_KEY',external_ai:'KV_AI_API_KEY',ai_moderation:'KV_MODERATION_API_KEY',object_storage:'KV_STORAGE_KEY',cdn:'KV_CDN_API_KEY',ads:'KV_AD_API_KEY',stt:'KV_STT_API_KEY',tts:'KV_TTS_API_KEY',virus_scanner:'KV_VIRUS_SCANNER_API_KEY'};
const configured=id=>Boolean(process.env[services[id]]&&String(process.env[services[id]]).trim());
const status=id=>({id,available:configured(id),enabled:configured(id),mode:configured(id)?'live':'fallback'});
function invoke(id,fn,fallback){if(!configured(id))return {ok:false,service:id,mode:'fallback',value:fallback};try{return {ok:true,service:id,mode:'live',value:fn()};}catch(e){return {ok:false,service:id,mode:'fallback',value:fallback,errorId:crypto.createHash('sha256').update(String(e.message||e)).digest('hex').slice(0,12)};}}
module.exports={services,status,invoke};
