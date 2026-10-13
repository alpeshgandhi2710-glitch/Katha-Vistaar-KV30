"use strict";
const crypto=require("node:crypto");
const URL_RE=/\b(?:https?:\/\/|www\.)[^\s]+/gi;
const THREAT_RE=/\b(kill|murder|bomb|attack|destroy|hurt)\b|\b(મારી|માર|હુમલો|ધમકી)\b/i;
const HARASS_RE=/\b(harass|harassment|stalk|stalking|dox|doxxing|blackmail|threaten|bully|bullying|intimidat|abuse)\b|\b(હેરાન|પીછો|ધમકી|બ્લેકમેલ|હેરાનગતિ)\b/i;
const SPAM_RE=/\b(buy now|free money|click here|limited offer|crypto offer|giveaway|airdrop|casino|loan offer)\b/i;
const PHISH_RE=/\b(verify your account|reset your password|otp|login here|wallet|seed phrase|private key|credential)\b/i;
const MALWARE_RE=/\b(malware|ransomware|trojan|virus|worm|payload|powershell|cmd\.exe|javascript:)\b/i;
const SECRET_RE=/\b(api[_ -]?key|access[_ -]?token|private[_ -]?key|recovery[_ -]?key|password|secret)\b/i;
function norm(v,max=6000){return String(v??"").replace(/[\u0000-\u001f]/g," ").slice(0,max)}
function textOf(input){return [input.title,input.body,input.comment,input.message,input.content,input.description,input.filename].filter(Boolean).map(x=>norm(x)).join(" ")}
function duplicateRatio(messages=[]){const a=messages.map(norm).filter(Boolean);if(a.length<2)return 0;const counts=new Map(a.map(x=>[x,(a.filter(y=>y===x).length)]));return Math.max(...counts.values())/a.length}
function assess(input={}){
 const t=textOf(input);const urls=(t.match(URL_RE)||[]);const signals=[];
 if(HARASS_RE.test(t))signals.push("harassment_or_stalking");
 if(THREAT_RE.test(t))signals.push("credible_threat_signal");
 if(SPAM_RE.test(t))signals.push("spam_promotion");
 if(PHISH_RE.test(t))signals.push("phishing_or_credential_lure");
 if(MALWARE_RE.test(t))signals.push("malware_or_command_signal");
 if(SECRET_RE.test(t))signals.push("secret_or_credential_signal");
 if(urls.length>=4)signals.push("high_link_density");
 const velocity=Number(input.messagesPerMinute||input.velocity||0);if(velocity>=20)signals.push("high_message_velocity");
 const dup=duplicateRatio(Array.isArray(input.recentMessages)?input.recentMessages:[]);if(dup>=.7)signals.push("repeated_content");
 const reports=Number(input.recentReports||input.reports||0);if(reports>=5)signals.push("report_cluster");
 let risk="low";
 if(signals.some(x=>["credible_threat_signal","malware_or_command_signal","secret_or_credential_signal","phishing_or_credential_lure"].includes(x)))risk="critical";
 else if(signals.some(x=>["harassment_or_stalking","report_cluster","high_message_velocity"].includes(x)))risk="high";
 else if(signals.length)risk="medium";
 const action=risk==="critical"?"quarantine_and_escalate_master_admin":risk==="high"?"rate_limit_and_review":risk==="medium"?"soft_block_and_review":"allow";
 return {id:crypto.randomUUID(),version:"KV30-P2-30W",risk,signals,action,confidence:signals.length?Math.min(.995,.78+signals.length*.04):.68,checks:{harassment:true,threats:true,spam:true,phishing:true,malware:true,secrets:true,linkDensity:true,velocity:true,duplicateContent:true,reportClustering:true},privacy:{minimumNecessary:true,rawSecretsReturned:false},failClosed:risk==="critical",createdAt:new Date().toISOString()};
}
function inspectSecurity(input={}){const a=assess(input);return {...a,decision:a.risk==="critical"?"block_and_escalate":a.risk==="high"?"contain_and_human_review":a.risk==="medium"?"limit_and_review":"allow_with_monitoring",masterAdminRequired:a.risk==="critical"};}
module.exports={assess,inspectSecurity,duplicateRatio};
