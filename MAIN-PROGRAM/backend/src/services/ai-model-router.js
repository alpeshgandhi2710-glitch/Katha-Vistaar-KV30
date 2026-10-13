'use strict';
const aiManagement=require('./ai-management.js');
const aiMemory=require('./ai-memory-rag.js');
const internal=require('./ai-internal-inference.js');
const aiKernel=require('./ai-kernel.js');
const aiEvaluation=require('./ai-evaluation.js');
const modelRuntime=require('./ai-internal-model-runtime.js');
const providerPolicy=require('./ai-provider-policy.js');
const externalGateway=require('./ai-external-gateway.js');
const intelligence=require('./ai-intelligence-engine.js');
const gateProfile=require('./external-gate-firewall.js');
const internalGateFirewall=require('./internal-gate-firewall.js');
function route({aiId,task,input,context={},allowExternal=false}={}){
 const id=String(aiId||'ai_orchestrator').trim();const entry=aiManagement.roles[id];
 if(!entry)throw Object.assign(new Error('ai_role_not_registered'),{code:'ai_role_not_registered'});
 if(entry.active===false||entry.managed!==true)throw Object.assign(new Error('ai_role_disabled'),{code:'ai_role_disabled'});
 const risk=String(context.risk||'low');const permissions=Array.isArray(context.permissions)?context.permissions:[];const actorRole=context.actorRole||'user';
 if(!aiManagement.authorizeInvocation(id,{risk,permissions,actorRole,external:allowExternal}))throw Object.assign(new Error('ai_management_policy_denied'),{code:'ai_management_policy_denied'});
 const text=String(input||task||'').trim();if(!text)throw Object.assign(new Error('ai_input_required'),{code:'ai_input_required'});
 const memoryScopes=Array.isArray(context.memoryScopes)?context.memoryScopes.filter(x=>['project','user','character','knowledge'].includes(x)):['project','character','knowledge'];
 const retrieved=memoryScopes.flatMap(scope=>{const owner=scope==='user'?context.userId:(scope==='project'?context.projectId:context.characterId);if(scope!=='knowledge'&&!owner)return [];return aiMemory.search(scope,text,3,owner).map(x=>({...x,scope}));}).slice(0,10);
 const internalGate=internalGateFirewall.aiGateFor(id);
 if(!internalGate)throw Object.assign(new Error('internal_ai_gate_not_registered'),{code:'internal_ai_gate_not_registered'});
 const ig=internalGateFirewall.authorizeInternal({gateId:internalGate.gate,serviceId:null,aiId:id});
 if(!ig.ok)throw Object.assign(new Error('internal_gate_firewall_denied'),{code:ig.reason});
 const result=internal.infer({aiId:id,task:task||'general',input:text,context,memory:retrieved});
 const quality=aiEvaluation.evaluate({aiId:id,task:task||'general',input:text,output:JSON.stringify(result.result),expected:context.expected});
 return {ok:true,aiId:id,task:String(task||'general'),execution:'internal',externalAllowed:Boolean(allowExternal),internalModel:internal.status(),memory:retrieved,quality:{pass:quality.pass,id:quality.id},result,governance:{managedBy:'ai_management',risk,policyChecked:true,externalUsed:false},legacyKernelAvailable:true};
}

async function routeAsync({aiId,task,input,context={},allowExternal=false}={}){
 const base=route({aiId,task,input,context,allowExternal:false});
 const intelligenceResult=await intelligence.execute({aiId,task,input,context});
 // Binding rule: internal AI is always the first execution attempt.
 // External AI may be used only when the internal natural-language model is unavailable/incapable,
 // the caller explicitly permits fallback, and Master-Admin external policy is enabled.
 if(intelligenceResult?.modelExecution?.ok===true){
   return {...base,
     result:{...base.result,
       modelExecution:intelligenceResult.modelExecution,
       naturalLanguage:intelligenceResult.naturalLanguage,
       finalOutput:intelligenceResult.finalOutput,
       review:intelligenceResult.review,
       intelligenceRunId:intelligenceResult.runId,
       intelligenceQuality:intelligenceResult.quality,
       intelligenceProfile:intelligence.profileFor(aiId)
     },
     providerPath:'internal-local-model',
     externalAttempted:false,
     externalUsed:false
   };
 }
 const policy=providerPolicy.status();
 const externalEligible=new Set(['ai_orchestrator','story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','research_ai','creator_ai','help_support_ai','engagement_ai','analytics_ai','reel_ai']).has(String(aiId));
 const safeForExternal=String(context.risk||'low')!=='critical' && externalEligible;
 if(policy.external?.enabled===true && allowExternal===true && safeForExternal){
   const roleGates=gateByAI[String(aiId)]||[];
   const gateId=roleGates[0]||gateByAI.ai_orchestrator?.[0]||'gate_13';
   const ext=await externalGateway.execute({provider:policy.external.provider||'auto',input,approved:true,usageMode:'internal_failed_external_fallback',gateId,actor:'master_admin',memoryTarget:'externalProjectMemoryBoundaryGate',idempotencyKey:`${String(aiId)}:${String(task||'general')}:${Date.now()}`});
   if(ext?.ok)return {...base,result:{...base.result,externalModelExecution:{ok:true,provider:ext.provider,model:ext.model,text:ext.text}},providerPath:'external-fallback-after-internal-failure',externalAttempted:true,externalUsed:true};
 }
 return {...base,
   result:{...base.result,
     modelExecution:intelligenceResult.modelExecution,
     naturalLanguage:intelligenceResult.naturalLanguage,
     finalOutput:intelligenceResult.finalOutput,
     review:intelligenceResult.review,
     intelligenceRunId:intelligenceResult.runId,
     intelligenceQuality:intelligenceResult.quality,
     intelligenceProfile:intelligence.profileFor(aiId)
   },
   providerPath:'internal-contract-fallback',
   externalAttempted:false,
   externalUsed:false
 };
}
function providerStatus(){return {policy:providerPolicy.status(),internal:modelRuntime.status(),external:externalGateway.status()};}

// Canonical specialist-work routing for the 31 managed Internal AIs.
// This is task selection only: identity/permission/policy checks still run in route().
// Gate IDs are loaded from the governed specialist-gate registry; writing_ai and media_security_ai are explicitly covered by gate_76 and gate_77. No gate is created implicitly by task routing.
const fs=require('node:fs');
const path=require('node:path');
const GATE_PROFILE_PATH=path.resolve(__dirname,'../../../website-first/config/external-gate-configuration-profile-v30.json');
const SPECIALIST_TASKS={
 ai_orchestrator:['orchestration','route request','specialist selection','task decomposition','workflow coordination','ai routing'],
 all_domain_master_intelligence_ai:['cross-domain analysis','ecosystem analysis','capability analysis','teaching coordination','multi-domain reasoning','planning','project planning','cross-domain planning'],
 master_admin_ai:['master admin advisory','governance analysis','ai ecosystem oversight','critical policy review'],
 designated_admin_ai:['delegated admin assistance','scoped admin review','admin escalation'],
 admin_ai:['admin advisory','admin-scoped assistance','operational admin review'],
 story_ai:['story planning','story writing','rewriting','continuation','plot consistency','novel','chapter','narrative'],
 character_ai:['character creation','character facts','personality','character continuity','relationship consistency'],
 audio_ai:['narration','voice direction','emotion voice','sound direction','speech to text','text to speech','audio'],
 comic_ai:['comic planning','panel planning','comic dialogue','storyboard','visual continuity','comic structure'],
 visual_ai:['scene planning','image planning','video planning','visual prompts','shot planning','visual consistency'],
 quality_ai:['quality review','consistency check','factual check','structural check','regression detection','qa'],
 research_ai:['research','source collection','provenance','knowledge acquisition','evidence review'],
 safety_policy_ai:['safety review','copyright review','privacy review','policy gating','content safety'],
 programmer_ai:['software engineering','code','debug','runtime analysis','test analysis','architecture','patch proposal'],
 design_ai:['ui design','ux design','responsive design','accessibility design','visual verification','layout'],
 creator_ai:['creator assistance','creator workflow','cross-format creator coordination','publishing assistance'],
 training_ai:['training','learning workflow','evaluation training','approved learning','knowledge refresh'],
 user_monitoring_ai:['user activity monitoring','user risk assessment','ticket initiation','account behavior risk'],
 monitoring_ai:['application monitoring','operational monitoring','policy violation monitoring','risk assessment','health monitoring'],
 damage_control_ai:['incident analysis','damage analysis','incident response','containment','recovery planning'],
 account_management_ai:['account lifecycle','account review','verification review','login history','account support','account ai','account management'],
 security_ai:['security analysis','authentication security','authorization security','security defense','security review'],
 anti_spam_malware_ai:['spam detection','phishing detection','malware detection','abuse detection','quarantine'],
 help_support_ai:['help','support','ticket assistance','support resolution','user issue'],
 accounting_ai:['ledger analysis','financial analysis','reconciliation','royalty analysis','payment accounting','purchase request','purchase order','procurement'],
 engagement_ai:['discovery','engagement analysis','recommendation analysis','retention','audience engagement'],
 analytics_ai:['content analytics','audience analytics','performance analytics','revenue analytics','metrics','report ai','reporting','reports'],
 reel_ai:['reel planning','reel workflow','reel publishing','short video planning','video publishing'],
 writing_ai:['writing assistance','prose refinement','author drafting','copy refinement','creative writing'],
 media_security_ai:['media asset security','media quarantine','media scan','media rights review','media risk'],
 cyber_defense_ai:['cyber defense','threat analysis','malware threat','credential threat','defensive security']
};
let gateByAI={};
try{
 const gp=JSON.parse(fs.readFileSync(GATE_PROFILE_PATH,'utf8'));
 for(const g of (gp.aiSpecialist||[])){(gateByAI[g.aiRole] ||= []).push(g.gate);}
}catch{gateByAI={};}
function specialistTaskStatus(){
 return Object.fromEntries(Object.entries(SPECIALIST_TASKS).map(([aiId,tasks])=>[aiId,{tasks:[...tasks],gateIds:[...(gateByAI[aiId]||[])],gateBacked:(gateByAI[aiId]||[]).length>0}]));
}
function resolveSpecialistForTask(task,{preferredAI=null}={}){
 const text=String(task||'').trim().toLowerCase();
 if(preferredAI && aiManagement.roles[preferredAI]) return {aiId:preferredAI,reason:'explicit_ai',gateIds:[...(gateByAI[preferredAI]||[])],task:text};
 if(!text) return {aiId:'ai_orchestrator',reason:'empty_task_default',gateIds:[...(gateByAI.ai_orchestrator||[])],task:text};
 let best=null;
 for(const [aiId,tasks] of Object.entries(SPECIALIST_TASKS)){
   let score=0;
   for(const t of tasks){const q=t.toLowerCase();if(text===q)score+=100;else if(text.includes(q)||q.includes(text))score+=10;else{for(const w of q.split(/\s+/)){if(w.length>=4&&text.includes(w))score+=1;}}}
   if(score>0&&(!best||score>best.score))best={aiId,score};
 }
 const aiId=best?.aiId||'ai_orchestrator';
 return {aiId,reason:best?'task_match':'orchestrator_default',score:best?.score||0,gateIds:[...(gateByAI[aiId]||[])],task:text};
}
async function routeByTask({task,input,context={},allowExternal=false,preferredAI=null}={}){
 const selected=resolveSpecialistForTask(task,{preferredAI});
 return {...await routeAsync({aiId:selected.aiId,task,input,context,allowExternal}),specialistRouting:selected};
}

module.exports={route,routeAsync,routeByTask,resolveSpecialistForTask,specialistTaskStatus,providerStatus,SPECIALIST_TASKS};
