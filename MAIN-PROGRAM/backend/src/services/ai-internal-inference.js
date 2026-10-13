'use strict';
const crypto=require('node:crypto');const languageSupport=require('./ai-language-support.js');
const modelRuntime=require('./ai-internal-model-runtime.js');
const fs=require('node:fs');
const path=require('node:path');
const VERSION='KV30-P2-30W';
const MODEL_ID='kv-internal-governed-contract-v2';
const startedAt=new Date().toISOString();
const CONSTITUTION_PATH=path.resolve(__dirname,'../../../website-first/config/ai-constitutions-v30.json');
function constitutionFor(aiId){try{const x=JSON.parse(fs.readFileSync(CONSTITUTION_PATH,'utf8'));return x.roles?.[aiId]||null;}catch{return null;}}
const runs=[];

const CONTRACT={
  modelId:MODEL_ID,version:VERSION,providerNeutral:true,externalRequired:false,
  capabilities:['classification','reasoning','planning','rewriting','structured_generation','consistency_check','risk_analysis','tool_planning','summarization','knowledge_synthesis'],
  mediaMode:'planning_and_direction',
  safety:'fail_closed'
};

function clean(v,max=8000){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').slice(0,max);}
function words(t){return clean(t,8000).trim().split(/\s+/).filter(Boolean);}
function sentences(t){return clean(t,8000).split(/(?<=[.!?।])\s+/).filter(Boolean);}
function bullets(items){return items.map(x=>`• ${x}`).join('\n');}
function langText(language,en,gu){return String(language||'en').toLowerCase().startsWith('gu')?gu:en;}

const EMOTIONS=['joy','grief','love','fear','hope','anger','shame','pride','longing','compassion','wonder','belonging','conflict','humour'];
const VOICE_GENDERS=['female','male','child'];
const VOICE_PROFILES=['warm_narrator','dramatic_narrator','conversational','documentary','comic','poetic'];
function emotionSignals(input){const t=String(input||'').toLowerCase();const map={joy:['joy','happy','celebrate','હર્ષ','ખુશ'],grief:['grief','loss','death','દુઃખ','વિયોગ'],love:['love','affection','પ્રેમ'],fear:['fear','danger','ડર','ભય'],hope:['hope','future','આશા'],anger:['anger','rage','ક્રોધ','ગુસ્સો'],shame:['shame','guilt','શરમ','અપરાધ'],pride:['pride','honour','ગૌરવ'],longing:['longing','miss','યાદ','ઝંખના'],compassion:['compassion','mercy','દયા'],wonder:['wonder','mystery','આશ્ચર્ય','રહસ્ય'],belonging:['belong','home','વતન','અપનાપો'],conflict:['conflict','argument','વિવાદ','સંઘર્ષ'],humour:['humour','humor','funny','મજાક','હાસ્ય']};return Object.entries(map).filter(([,terms])=>terms.some(x=>t.includes(x))).map(([e])=>e).slice(0,5);}
function creativeDirection(input,language){const detected=emotionSignals(input);return {humanCentric:true,nationalIndianContext:true,primaryEmotion:detected[0]||'mixed',emotions:detected.length?detected:['mixed'],signals:['subtext','relationships','social_context','cultural_context','sensory_detail','natural_dialogue','silence_and_pause','nonverbal_cues'],principles:['show rather than label emotion','preserve cultural nuance without unsupported claims','allow mixed/ambiguous feelings','vary dialogue by character and situation'],language};}
function voiceOptions(language){return VOICE_GENDERS.flatMap(g=>VOICE_PROFILES.map(profile=>({id:`${g}_${profile}`,gender:g,profile,language,delivery:profile==='dramatic_narrator'?'dynamic':profile==='comic'?'brisk':'natural',emotionRange:EMOTIONS})));}
function humanBeatPlan(input,count=5,language='en'){const s=sentences(input);const emotions=emotionSignals(input);const n=Math.max(2,Math.min(12,count));const phases=['hook','connection','pressure','emotional_turn','payoff'];return Array.from({length:n},(_,i)=>({beat:i+1,phase:phases[i%phases.length],scene:s[i%s.length]||clean(input,300),emotion:emotions[i%Math.max(1,emotions.length)]||'mixed',subtext:i===0?'What the character wants is not necessarily what they say.':i===n-1?'Let the ending land through action, silence or consequence.':'Let behavior and dialogue carry the feeling.',sensoryCue:['sound','light','texture','smell','gesture'][i%5],language}));}

const handlers={
 story_ai({input,language}){
  const s=sentences(input);const title=s[0]?.slice(0,90)||'Untitled story';
  return {domain:'story',operation:'human_director_story_development',title,analysis:langText(language,'Story request is structured around character desire, consequence, pacing and emotional truth.','વાર્તાને પાત્રની ઇચ્છા, પરિણામ, pacing અને ભાવનાત્મક સત્ય આસપાસ ગોઠવવામાં આવી છે.'),creativeDirection:creativeDirection(input,language),beats:humanBeatPlan(input,5,language),plan:['opening hook','character desire and setting','conflict and consequence','emotional turn','resolution or deliberate cliffhanger'],continuityChecks:['character facts','timeline','cause/effect','point of view','chapter/scene boundaries','emotion-to-action continuity'],voiceOptions:voiceOptions(language),draftSeed:s.slice(0,4).join(' ')||input};
 },
 character_ai({input,language}){
  const s=sentences(input);return {domain:'character',operation:'emotion_aware_character_sheet',creativeDirection:creativeDirection(input,language),voiceOptions:voiceOptions(language),fields:{name:s[0]?.replace(/^character\s*:?/i,'').slice(0,80)||'Unnamed Character',role:'derive from story context',goal:'derive from request',motivation:'derive from request',conflict:'identify and validate',traits:words(input).slice(0,8)},consistencyRules:['facts are canonical only when explicitly approved','personality must remain consistent unless an event justifies change','relationships and timeline must be checked before continuation'],language:String(language||'en')};
 },
 audio_ai({input,language}){
  return {domain:'audio',operation:'emotion_aware_audio_direction',scriptSummary:clean(input,700),creativeDirection:creativeDirection(input,language),direction:{voice:'character-appropriate and emotionally truthful',emotion:'follow subtext and scene intent',pace:'vary with tension, intimacy and action',pronunciation:'validate names and Indian/local terms',mix:'speech-first with controlled background levels',pause:'use meaningful silence instead of filling every gap'},voiceOptions:voiceOptions(language),rightsChecks:['voice rights','music/SFX rights','script rights'],generationMode:'internal-planning-first'};
 },
 comic_ai({input,language}){
  const count=Math.max(3,Math.min(12,sentences(input).length||4));const beats=humanBeatPlan(input,count,language);const panels=beats.map((b,i)=>({panel:i+1,scene:b.scene,emotion:b.emotion,subtext:b.subtext,dialogue:i===0?'Natural opening line or visual beat':i===count-1?'A restrained closing line or meaningful silence':'Dialogue that reveals intention without explaining the feeling',visualDirection:`Show ${b.emotion} through action, expression, framing and environment`,sensoryCue:b.sensoryCue,visualContinuity:'check character/location/props'}));return {domain:'comic',operation:'emotion_aware_panel_plan',panels,creativeDirection:creativeDirection(input,language),voiceOptions:voiceOptions(language),globalChecks:['character appearance','location continuity','dialogue readability','panel pacing','emotion continuity','image/media rights'],language};
 },
 visual_ai({input,language}){
  return {domain:'visual',operation:'visual_plan',brief:clean(input,1200),shotPlan:[{shot:1,type:'establishing',purpose:'place viewer in scene'},{shot:2,type:'character',purpose:'capture emotion and identity'},{shot:3,type:'action/detail',purpose:'advance story information'}],consistency:['character reference','wardrobe','lighting','location','camera language'],promptPolicy:'approved project context only; no unlicensed protected style imitation'};
 },
 quality_ai({input,language}){
  const t=clean(input);const flags=[];if(/contradict|conflict|different|but|however/i.test(t))flags.push('possible_contradiction');if(t.length<30)flags.push('insufficient_context');return {domain:'quality',operation:'quality_review',risk:flags.length?'review':'low',flags,checks:['factual consistency','structural consistency','character continuity','timeline','rights/policy','output completeness'],recommendation:flags.length?'Collect missing context and run targeted regression before approval.':'Proceed to normal quality/safety gate.'};
 },
 research_ai({input,language}){
  return {domain:'research',operation:'research_plan',question:clean(input,1600),steps:['decompose research question','identify authoritative source classes','collect evidence with provenance','cross-check conflicting claims','store only approved knowledge'],sourcePolicy:'approved/traceable sources only',knowledgeWrite:'requires approval',language};
 },
 safety_policy_ai({input,language}){
  const sensitive=/(password|otp|private key|recovery key|bank|pan|secret|credential)/i.test(input);return {domain:'safety_policy',operation:'policy_gate',decision:sensitive?'block_or_escalate':'allow_with_review',signals:sensitive?['restricted_data_signal']:[],checks:['privacy','copyright','safety','authority','secret leakage','external-data policy'],humanApprovalRequired:sensitive,language};
 },
 programmer_ai({input}){return {domain:'engineering',operation:'root_cause_plan',steps:['reproduce','inspect route/API','inspect state/persistence','identify root cause','patch smallest correct layer','run syntax/unit/integration/browser regression','verify release artifacts'],productionChange:'approval_required',input:clean(input,1600)};},
 design_ai({input}){return {domain:'design',operation:'design_review',checks:['responsive layout','touch targets','accessibility','typography','spacing','icon consistency','loading/error states','Stitch/reference parity'],changePolicy:'proposal only until human approval',input:clean(input,1600)};},
 creator_ai({input,language}){return {domain:'creator',operation:'emotion_aware_creator_assist',creativeDirection:creativeDirection(input,language),voiceOptions:voiceOptions(language),suggestions:['strengthen hook','check structure and continuity','verify rights','review media quality','creator retains final approval'],publication:'human creator approval required',input:clean(input,1600)};},
 training_ai({input,language}){return {domain:'training',operation:'emotion_aware_learning_plan',stages:['observe','diagnose','practice','emotion-aware rehearsal','evaluate','approved refresh'],creativeDirection:creativeDirection(input,language),voiceOptions:voiceOptions(language),teachingSignals:['encouragement','patience','clarity','constructive correction','confidence building','culturally respectful examples'],restrictions:['no sensitive uncontrolled training','no automatic production retraining'],target:clean(input,1200),language};},
 user_monitoring_ai({input}){return {domain:'monitoring',operation:'risk_assessment',signals:/(spam|phish|fraud|malware|takeover|threat)/i.test(input)?['risk_signal']:[],decision:/(spam|phish|fraud|malware|takeover|threat)/i.test(input)?'review':'allow',privacy:'minimum necessary data'};},
 monitoring_ai({input}){return {domain:'monitoring',operation:'ecosystem_monitor',checks:['health','policy violations','error rates','latency','dependency availability'],recommendation:'investigate material deviations before changing production state',input:clean(input,1200)};},
 damage_control_ai({input}){const high=/(data loss|malware|virus|tamper|defacement)/i.test(input);return {domain:'damage_control',operation:'incident_plan',severity:high?'high':/(broken|damage|unauthorized)/i.test(input)?'medium':'low',steps:['contain','preserve evidence','assess scope','recover from verified backup if required','validate integrity','document incident'],masterAdminRequired:high};},
 account_management_ai({input}){return {domain:'account_management',operation:'account_review',checks:['identity','account state','verification','login history','policy state','appeal/ticket status'],actions:['view','support','review'],restrictedActions:'lock/deactivate/reactivate remain permission controlled',input:clean(input,1200)};},
 security_ai({input}){const security=require('./security-defense-ai.js');return {domain:'security',operation:'defense_review',...security.inspectSecurity({content:input}),masterAdminBoundary:['critical security policy','recovery','secrets','authority','deployment']};},
 anti_spam_malware_ai({input}){const security=require('./security-defense-ai.js');const assessment=typeof security.assess==='function'?security.assess({content:input}):{};const hit=/(spam|phish|malware|virus|scam|payload)/i.test(input);return {domain:'security_detection',operation:'abuse_detection',...assessment,detected:assessment.detected===true||hit,action:(assessment.detected===true||hit)?'quarantine/review':'allow',evidence:hit?[clean(input,300)]:[]};},
 help_support_ai({input,language}){return {domain:'support',operation:'support_resolution',answer:langText(language,'Use the relevant Help flow. If the issue requires account-specific access, authenticate with a verified contact and create a ticket.','સંબંધિત Help flow વાપરો. Account-specific મદદ માટે verified contact સાથે login કરીને ticket બનાવો.'),escalation:'human support when unresolved or high-risk',input:clean(input,1200)};},
 accounting_ai({input}){return {domain:'accounting',operation:'financial_analysis',checks:['transaction identity','ledger balance','idempotency','refund/chargeback state','audit trail'],action:'analysis_only_until_authorized_financial approval',input:clean(input,1200)};},
 engagement_ai({input}){return {domain:'engagement',operation:'engagement_analysis',metrics:['discovery','view completion','likes','follows','subscriptions','retention'],privacy:'use collected activity only; do not infer sensitive demographics',input:clean(input,1200)};},
 analytics_ai({input}){return {domain:'analytics',operation:'data_analysis_plan',steps:['validate data source','check completeness','segment only authorized dimensions','calculate metrics','explain uncertainty','publish auditable result'],input:clean(input,1200)};},
 reel_ai({input,language}){return {domain:'reel',operation:'emotion_aware_reel_plan',durationTarget:'declared duration',beats:humanBeatPlan(input,5,language),creativeDirection:creativeDirection(input,language),voiceOptions:voiceOptions(language),checks:['duration','caption readability','media rights','visual continuity','audio loudness','emotional arc','hook-to-payoff coherence'],input:clean(input,1400)};},
 all_domain_master_intelligence_ai({input}){return {domain:'cross_domain',operation:'ecosystem_reasoning',coordination:['identify domain','retrieve permitted context','delegate specialist','cross-check result','escalate risk','return governed recommendation'],approvalBoundary:'critical actions require Human Master Admin',input:clean(input,1600)};},
 master_admin_ai({input}){return {domain:'master_governance',operation:'master_advisory',recommendation:'review evidence, authority, policy, risk and rollback before critical action',criticalActions:'Human Master Admin remains final authority',input:clean(input,1600)};},
 designated_admin_ai({input}){return {domain:'delegated_admin',operation:'scoped_admin_advisory',recommendation:'act only within explicitly granted rights and scope; escalate beyond scope',input:clean(input,1400)};},
 admin_ai({input}){return {domain:'admin',operation:'admin_advisory',recommendation:'use only explicitly granted permissions; never self-elevate',input:clean(input,1400)};},
 writing_ai({input,language}){return {domain:'writing',operation:'writer_assistance',creativeDirection:creativeDirection(input,language),plan:['understand author intent','preserve canonical facts','draft/refine','quality and continuity review'],language,input:clean(input,1600),approval:'author_or_authorized_admin'};},
 media_security_ai({input}){return {domain:'media_security',operation:'asset_security_review',checks:['quarantine','type/size validation','security scan','rights/policy review','publish approval'],humanApprovalForPublish:true};},
 cyber_defense_ai({input}){const security=require('./security-defense-ai.js');return {domain:'cyber_defense',operation:'defensive_security_review',assessment:security.inspectSecurity({content:input}),checks:['threat detection','credential protection','malware signal','containment','evidence preservation','human escalation'],criticalActionsRequireMasterAdmin:true};},
 ai_orchestrator({input}){return {domain:'orchestration',operation:'request_plan',pipeline:['identity','permission','policy','memory/knowledge','specialist selection','internal inference','quality/safety','audit/state'],fallback:'safe escalation',input:clean(input,1800)};}
};

function infer({aiId,task,input,context={},memory=[]}={}){
 const id=String(aiId||'ai_orchestrator');if(!handlers[id])throw Object.assign(new Error('internal_ai_handler_not_found'),{code:'internal_ai_handler_not_found'});
 const started=Date.now();const rawInput=clean(input||task||'');const lang=languageSupport.resolve(context.language,rawInput);const result=handlers[id]({input:rawInput,task,language:lang.code,context,memory});
 result.language=lang.code;result.languageInfo=languageSupport.info(lang.code);result.languageSupport={requiredLanguages:23,allSupported:true,futureLanguagesAllowed:true,requestedLanguage:String(context.language||''),detected:lang.detected,confidence:lang.confidence,nativeResponseContract:true};
 result.localizedStatus=languageSupport.localize(lang.code,'aiReady');result.localizedReview=languageSupport.localize(lang.code,'reviewRequired');
 const row={id:crypto.randomUUID(),aiId:id,task:String(task||'general'),modelId:MODEL_ID,version:VERSION,execution:'internal',language:lang.code,latencyMs:Date.now()-started,createdAt:new Date().toISOString(),result};
 runs.push(row);if(runs.length>2000)runs.shift();return {ok:true,provider:'internal',model:MODEL_ID,version:VERSION,externalRequired:false,language:lang.code,languageContract:languageSupport.contract(),result,runId:row.id};
}
async function inferWithModel({aiId,task,input,context={},memory=[]}={}){
 const base=infer({aiId,task,input,context,memory});
 const lang=base.language||languageSupport.resolve(context.language,input).code;
 const constitution=constitutionFor(aiId);
 const model=await modelRuntime.generate({aiId,task,input,language:lang,memory,context,constitution:JSON.stringify(constitution||{})});
 if(!model.ok)return {...base,modelExecution:{ok:false,reason:model.reason||'local_model_unavailable',fallback:'governed_internal_contract'}};
 const quality=aiEvaluationSafe({aiId,input,task,text:model.text,expected:context.expected});
 return {...base,modelExecution:{ok:true,provider:model.provider,model:model.model,language:model.language,requestId:model.requestId},naturalLanguage:{text:model.text,language:model.language},quality:modelQuality(quality)};
}
function aiEvaluationSafe({aiId,input,task,text,expected}){return {pass:typeof text==='string'&&text.trim().length>0,aiId,task,inputLength:String(input||'').length,expectedProvided:expected!==undefined};}
function modelQuality(q){return q;}
function status(){return {provider:'internal',modelId:MODEL_ID,version:VERSION,providerNeutral:true,externalRequired:false,handlers:Object.keys(handlers).length,handlerAIs:Object.keys(handlers),runs:runs.length,startedAt,capabilities:CONTRACT.capabilities,languageSupport:languageSupport.contract(),localModelRuntime:modelRuntime.status()};}
function snapshot(){return {version:VERSION,runs:runs.slice(-2000)};}
function restore(s){runs.length=0;if(Array.isArray(s?.runs))runs.push(...s.runs.slice(-2000));return status();}
module.exports={CONTRACT,infer,inferWithModel,status,snapshot,restore,handlers};
