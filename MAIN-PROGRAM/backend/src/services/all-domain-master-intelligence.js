const crypto=require('node:crypto');

const ROLE_ID='all_domain_master_intelligence_ai';
const SUPERIORS=new Set(['master_admin','master_admin_ai']);
const forbiddenCategories=new Set(['master_recovery','secrets','product_keys','security_policy','backup_recovery','authority_hierarchy']);

const capabilities=[
  'cross_domain_reasoning','ai_training','ai_activity_monitoring','ai_to_ai_coordination',
  'capability_gap_analysis','new_ai_service_proposals','role_proposals','incident_analysis',
  'security_guidance','software_guidance','design_guidance','creator_guidance',
  'accounting_guidance','engagement_guidance','governance_analysis'
];

function riskFor(action='general'){
  if(forbiddenCategories.has(String(action))) return 'critical';
  if(['deploy_code','change_ai_role','change_ai_policy','activate_external_service'].includes(String(action))) return 'high';
  return 'low';
}
function canApply({actorRole, action='general', approval}={}){
  const risk=riskFor(action);
  if(risk==='critical') return actorRole==='master_admin' && approval?.approved===true && approval?.role==='master_admin';
  if(risk==='high') { if(actorRole==='master_admin') return approval?.approved===true && approval?.role==='master_admin'; if(actorRole==='admin') return approval?.approved===true && approval?.role==='admin' && Array.isArray(approval?.rightsGranted) && approval.rightsGranted.some(x=>['*','admin:*','ai.governance','ai:'+String(action)].includes(String(x))); return false; }
  return ['user','admin','master_admin'].includes(actorRole);
}
function proposeNewAI({name,reason,capabilities:requested=[]}={}){
  const safeName=String(name||'').trim();
  if(!safeName) throw Object.assign(new Error('ai_name_required'),{code:'ai_name_required'});
  return {
    id:crypto.randomUUID(), type:'new_ai_service_proposal', name:safeName,
    reason:String(reason||'capability gap identified').slice(0,2000),
    capabilities:Array.from(new Set(requested.map(String))).slice(0,50),
    status:'proposal_only', approvalRequired:'admin_or_master_admin',
    createdAt:new Date().toISOString()
  };
}
function trainPlan({targetAI,observations=[]}={}){
  return {
    id:crypto.randomUUID(), type:'governed_training_plan', targetAI:String(targetAI||''),
    observations:Array.isArray(observations)?observations.slice(0,50):[],
    stages:['observe','analyse','propose','approval_if_required','apply','test','verify','approved_knowledge_refresh'],
    policyBound:true, selfModification:false, createdAt:new Date().toISOString()
  };
}
function monitorSnapshot(registry={}){
  const entries=Object.entries(registry||{});
  return {
    id:crypto.randomUUID(), type:'ai_ecosystem_snapshot',
    count:entries.length,
    active:entries.filter(([,v])=>v?.active!==false).length,
    policyBound:entries.every(([,v])=>v?.learning==='policy_bounded'||v?.policyBound!==false),
    generatedAt:new Date().toISOString()
  };
}
module.exports={ROLE_ID,SUPERIORS,capabilities,riskFor,canApply,proposeNewAI,trainPlan,monitorSnapshot};
