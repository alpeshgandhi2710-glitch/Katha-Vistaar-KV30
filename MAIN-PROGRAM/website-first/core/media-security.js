'use strict';
const crypto=require('node:crypto');
const MAX_BYTES=1024*1024*1024;
const ALLOWED=new Set(['image/png','image/jpeg','image/webp','image/gif','audio/mpeg','audio/wav','audio/mp4','audio/aac','audio/ogg','audio/opus','audio/flac','video/mp4','video/webm','video/quicktime','video/x-matroska','video/x-m4v','application/pdf']);
const SUSPICIOUS=[/eval\s*\(/i,/powershell/i,/cmd\.exe/i,/javascript:/i,/<script\b/i,/phishing/i,/malware/i,/ransomware/i,/virus/i];
function scanSample({mimeType,buffer,filename=''}){
 if(!ALLOWED.has(mimeType))return {ok:false,status:'blocked',reason:'unsupported_media_type'};
 if(!Buffer.isBuffer(buffer)||buffer.length===0)return {ok:false,status:'blocked',reason:'empty_or_invalid_file'};
 if(buffer.length>MAX_BYTES)return {ok:false,status:'blocked',reason:'media_too_large'};
 const sample=buffer.subarray(0,Math.min(buffer.length,262144)).toString('utf8');
 const suspicious=SUSPICIOUS.find(r=>r.test(sample));
 if(suspicious)return {ok:false,status:'blocked',reason:'security_pattern_detected'};
 return {ok:true,status:'quarantined',reason:'internal_preflight_passed',filename:String(filename).slice(0,160),requiresPublishReview:true};
}
function scan({mimeType,buffer,filename=''}){const r=scanSample({mimeType,buffer,filename});if(!r.ok)return r;const sha256=crypto.createHash('sha256').update(buffer).digest('hex');return {...r,sha256,size:buffer.length};}
module.exports={ALLOWED,MAX_BYTES,scan,scanSample};
