const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const externalAI=require('./external-ai.js');
const internalModelRuntime=require('./ai-internal-model-runtime.js');
const providerPolicy=require('./ai-provider-policy.js');
const aiRouter=require('./ai-model-router.js');
const ROOT=path.resolve(__dirname,'../../../website-first');
const VERSION='KV30-P2-30W';
const startedAt=new Date().toISOString();
const feedbackLog=[];
const knowledge=[];
let lastRefresh=new Date().toISOString();
function addKnowledge(id,area,patterns,answer,escalation='none',priority=1){knowledge.push({id,area,patterns,answer,escalation,priority});}
addKnowledge('auth-login','software',['login','log in','password','sign in'],'Use the Login screen with username, registered email, or registered mobile plus password. If verification is required, complete the OTP step.','none',5);
addKnowledge('otp','help',['otp','one time','verification code','ઓટીપી','पासવર્ડ भूल'],'Use Resend OTP if needed. SMS OTP can be auto-filled by supported secure browser APIs; email OTP cannot be silently read by a browser and must use the provider/device autofill or local test handoff.','none',8);
addKnowledge('account-otp','account',['did not receive my otp','otp not received','verification code not received','otp problem','ઓટીપી મળ્યો નથી'],'For a login or registration OTP problem, use Resend OTP. Supported SMS browsers can securely autofill the code; email OTP cannot be silently read by a web page.','none',9);
addKnowledge('payment','payment',['payment','purchase','subscription','coin','upi','ચુકવણી','पेमेन्ट'],'For internal payment, select the plan/coin pack, request the payment OTP, verify it, then the server commits the transaction idempotently. External payment remains provider-gated.','admin',5);
addKnowledge('security','security',['security','hack','hacked','account takeover','csrf','xss','secret','key','password','ચોરી','હેક'],'Security-sensitive cases must be handled fail-closed. Never expose secrets, bypass authentication, or modify security policy without the required human authority.','master_admin',10);
addKnowledge('design','design',['design','ui','ux','icon','layout','mobile','responsive','spacing','font'],'Review the canonical Katha Vistaar mobile design system: compact information density, consistent SVG icons, accessible touch targets, safe-area spacing, responsive cards and no native browser dialogs.','design',4);
addKnowledge('software','software',['bug','error','crash','route','api','test','syntax','function','code'],'Perform root-cause analysis first: reproduce, inspect route/API/state/persistence, patch the smallest correct layer, then rerun static, API, browser and regression tests. Never suppress a failure.','programmer',8);
addKnowledge('help-ticket','support',['ticket','support','complaint','help','issue','problem'],'If Internal AI cannot safely resolve a support issue, create a user-owned ticket using the verified login contact and route it to Designated Admin or Master Admin according to risk.','admin',6);
addKnowledge('ai-governance','ai',['ai','artificial intelligence','learning','self update','training','model'],'Internal AI may continuously refresh its approved knowledge index, test telemetry and human-approved support patterns while the server is connected. It must not self-modify production code, permissions, secrets or critical policy. High-risk changes require Master Admin approval.','master_admin',10);
addKnowledge('backup','security',['backup','recovery','master backup','emergency backup'],'Application Backup and Master/Admin Emergency Backup are separate. Recovery private keys and secrets must remain external and must never be bundled or hard-coded.','master_admin',10);
addKnowledge('profile','help',['profile','username','user id','userid','author profile','creator profile'],'Username and User ID are separate unique identifiers. Public profiles can be viewed without login; follow, subscribe and messaging obey authentication and relationship rules.','none',4);
function normalize(v){return String(v||'').toLowerCase().normalize('NFKC');}
function scoreEntry(e,text){let score=0;for(const p of e.patterns){if(text.includes(normalize(p)))score+=p.length>5?3:2;}return score+e.priority*.1;}
function classify(text){return [...knowledge].map(e=>({e,score:scoreEntry(e,text)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);}
function sensitive(text){return /(payment|fraud|hack|security|privacy breach|secret|private key|master admin|account takeover|legal|refund|chargeback|credential|bank|upi)/i.test(text);}
function answerFor(hit,text,language){let answer=hit.e.answer;if(language==='gu'&&hit.e.id==='software')answer='પહેલા સમસ્યા ફરી ઉત્પન્ન કરો, પછી route → API → state → persistence તપાસો. Error છુપાવશો નહીં; root cause સુધારી static, API, browser અને regression tests ફરી ચલાવો.';if(language==='gu'&&hit.e.id==='ai-governance')answer='Internal AI server સાથે જોડાયેલ હોય ત્યારે approved knowledge, support feedback અને test telemetry સતત refresh કરી શકે છે, પરંતુ production code, permission, secret અથવા critical policy પોતે બદલી શકતું નથી.';return answer;}
function help({problem,layer='internal',language='en',context={}}){const text=normalize(problem),ranked=classify(text),hit=ranked[0];const highRisk=sensitive(text);const threshold=highRisk?4.5:2.5;const resolved=!!hit&&hit.score>=threshold&&!highRisk;let reply=resolved?answerFor(hit,text,language):'I need a safer or more specific review for this request. I will not guess about security, payments, permissions or critical system changes.';let escalation=resolved?hit.e.escalation:(highRisk?'master_admin':'admin');let ticketSuggested=!resolved||highRisk;let confidence=resolved?Math.min(.99,.72+hit.score*.04):.42;if(highRisk&&!resolved)confidence=.2;return {engine:'Katha-Vistaar-Internal-AI-Kernel',version:VERSION,layer,category:resolved?hit.e.area:(highRisk?'security':'general'),resolved,reply,confidence,escalation,ticketSuggested,knowledgeMatches:ranked.slice(0,4).map(x=>x.e.id),safeBoundaries:['no_secret_disclosure','no_permission_bypass','no_unapproved_code_change','no_unapproved_payment_action','master_admin_for_high_risk'],humanApprovalRequired:highRisk||escalation==='master_admin'};}
function feedback(x){const record={id:'AIFB-'+crypto.randomBytes(5).toString('hex').toUpperCase(),...x,createdAt:new Date().toISOString(),status:'queued_for_review'};feedbackLog.push(record);if(feedbackLog.length>500)feedbackLog.shift();return record;}
function refreshApprovedKnowledge(){try{const files=['config/ai-governance-v30.json','config/support-routing-v30.json','config/ai-integrity-v30.json'];for(const rel of files){const f=path.join(ROOT,rel);if(fs.existsSync(f))JSON.parse(fs.readFileSync(f,'utf8'));}lastRefresh=new Date().toISOString();return {ok:true,lastRefresh};}catch(e){lastRefresh=new Date().toISOString();return {ok:false,lastRefresh,error:e.message};}}
const refreshTimer=setInterval(refreshApprovedKnowledge,5*60*1000);if(refreshTimer.unref)refreshTimer.unref();refreshApprovedKnowledge();
async function orchestrate({problem,language='en',layer='internal',risk='auto',allowExternal=false,context={}}={}){
 const base=help({problem,language,layer});
 const highRisk=base.humanApprovalRequired||sensitive(problem);
 if(highRisk)return {...base,externalAttempted:false,decision:'human_approval_required'};
 const actorRole=layer==='master_admin_assist'?'master_admin':(layer==='designated_admin_assist'?'designated_admin':(['public_help','public_login_assist','internal_authenticated'].includes(layer)?'user':'admin'));
 const routed=await aiRouter.routeAsync({
  aiId:'help_support_ai',task:'support',input:String(problem||'').slice(0,6000),
  context:{...context,actorRole,language,risk:highRisk?'high':'low',taskMode:'support',permissions:Array.isArray(context.permissions)?context.permissions:[]},
  allowExternal:Boolean(allowExternal)
 });
 if(routed?.providerPath==='internal-local-model'&&routed?.result?.naturalLanguage)return {...base,resolved:true,reply:String(routed.result.naturalLanguage),externalAttempted:false,externalUsed:false,decision:'internal_local_model',aiId:'help_support_ai',governance:routed.governance};
 if(routed?.providerPath==='external-fallback-after-internal-failure'&&routed?.result?.externalModelExecution?.text)return {...base,resolved:true,reply:String(routed.result.externalModelExecution.text),externalAttempted:true,externalUsed:true,externalProvider:routed.result.externalModelExecution.provider,externalModel:routed.result.externalModelExecution.model,decision:'advisory_answer',aiId:'help_support_ai',governance:routed.governance};
 return {...base,externalAttempted:false,decision:'internal_contract_fallback',aiId:'help_support_ai',governance:routed?.governance||{internalGateRequired:true}};
}
function knowledgeStatus(){return {version:VERSION,startedAt,entries:knowledge.length,feedbackQueued:feedbackLog.length,mode:'continuous-approved-knowledge-refresh',selfModification:false,lastRefresh,externalProviders:externalAI.status(),governance:'human-admin-final-authority'};}
module.exports={help,orchestrate,feedback,knowledgeStatus};
