'use strict';
const crypto=require('node:crypto');

// Canonical AI Management registry. Every AI in the active ecosystem is managed here.
const roles={
  ai_orchestrator:{tier:'L1',authority:'system_coordinator',masterOf:'identity-aware routing, policy checks, memory/knowledge/tool orchestration',superior:'master_admin',approval:'master_admin_for_critical'},
  all_domain_master_intelligence_ai:{tier:'L1',authority:'cross_domain_master_advisor',masterOf:'cross-domain AI coordination, teaching, monitoring and capability analysis',superior:'master_admin_ai_or_master_admin',approval:'admin_or_master_admin'},
  master_admin_ai:{tier:'L1',authority:'master_advisor',masterOf:'Master Admin advisory, governance analysis and AI ecosystem oversight',superior:'master_admin',approval:'master_admin'},
  designated_admin_ai:{tier:'L1',authority:'delegated_admin_advisor',masterOf:'Designated Admin scoped assistance',superior:'designated_admin',approval:'admin_or_master_admin'},
  admin_ai:{tier:'L1',authority:'admin_advisor',masterOf:'Admin-scoped advisory assistance',superior:'designated_admin',approval:'admin_or_master_admin'},

  story_ai:{tier:'L2',authority:'story_domain',masterOf:'story planning, writing, rewriting, continuation and plot consistency',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  character_ai:{tier:'L2',authority:'character_domain',masterOf:'character facts, personality, creation and long-term consistency',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  audio_ai:{tier:'L2',authority:'audio_domain',masterOf:'narration, voice direction, emotion and sound direction',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  comic_ai:{tier:'L2',authority:'comic_domain',masterOf:'panel planning, dialogue, visual continuity and comic structure',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  visual_ai:{tier:'L2',authority:'visual_domain',masterOf:'scene/image/video planning, prompts, shot planning and visual consistency',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  quality_ai:{tier:'L2',authority:'quality_domain',masterOf:'quality, consistency, factual/structural checks and regression detection',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  research_ai:{tier:'L2',authority:'research_domain',masterOf:'approved research, source collection and knowledge acquisition',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  safety_policy_ai:{tier:'L2',authority:'safety_policy',masterOf:'safety, copyright, privacy and policy gating',superior:'ai_orchestrator',approval:'admin_or_master_admin'},

  programmer_ai:{tier:'L2',authority:'engineering_domain',masterOf:'software engineering, runtime and test analysis',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  design_ai:{tier:'L2',authority:'design_domain',masterOf:'UI/UX, Stitch comparison and visual verification',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  creator_ai:{tier:'L2',authority:'creator_domain',masterOf:'creator assistance within creator permissions',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  training_ai:{tier:'L2',authority:'training_domain',masterOf:'controlled training and learning workflows',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  user_monitoring_ai:{tier:'L2',authority:'safety_monitoring',masterOf:'user activity monitoring, risk assessment and ticket initiation',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  monitoring_ai:{tier:'L2',authority:'monitoring',masterOf:'monitoring, policy violation and risk assessment',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  damage_control_ai:{tier:'L2',authority:'damage_analysis',masterOf:'incident and damage analysis',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  account_management_ai:{tier:'L2',authority:'account_management',masterOf:'account lifecycle guidance and risk review',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  security_ai:{tier:'L2',authority:'security',masterOf:'security analysis and guidance',superior:'master_admin',approval:'master_admin'},
  anti_spam_malware_ai:{tier:'L2',authority:'security_detection',masterOf:'spam, malware and abuse detection',superior:'security_ai',approval:'admin_or_master_admin'},
  help_support_ai:{tier:'L2',authority:'support',masterOf:'state-aware help and support',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  accounting_ai:{tier:'L2',authority:'financial_advisor',masterOf:'ledger reconciliation and financial analysis',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  engagement_ai:{tier:'L2',authority:'engagement_advisor',masterOf:'discovery and engagement analysis',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  analytics_ai:{tier:'L2',authority:'analytics_advisor',masterOf:'content, audience and performance analytics',superior:'ai_orchestrator',approval:'admin_or_master_admin'},
  reel_ai:{tier:'L2',authority:'reel_domain',masterOf:'reel assistance and planning',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  writing_ai:{tier:'L2',authority:'writing_domain',masterOf:'writing assistance, prose refinement and creator-author drafting',superior:'ai_orchestrator',approval:'author_or_admin_or_master_admin'},
  media_security_ai:{tier:'L2',authority:'media_security',masterOf:'media asset security, quarantine, scan and rights-risk guidance',superior:'security_ai',approval:'admin_or_master_admin'},
  cyber_defense_ai:{tier:'L2',authority:'cyber_defense',masterOf:'cyber security defense, threat analysis and defensive guidance',superior:'security_ai',approval:'master_admin'}
};
for(const v of Object.values(roles)){v.active=true;v.managed=true;v.externalAllowed=false;v.learning='policy_bounded';}
const criticalCategories=new Set(['security_policy','master_recovery','secrets','product_keys','backup_recovery','authority_hierarchy','deploy_code']);
const publicUserAIs=new Set(['ai_orchestrator','story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','research_ai','safety_policy_ai','creator_ai','help_support_ai','engagement_ai','analytics_ai','reel_ai','writing_ai','media_security_ai','cyber_defense_ai']);
const rolePermissionAliases={programmer_ai:['programmer.ai.approve'],design_ai:['design.ai.approve'],training_ai:['ai.training'],security_ai:['security.manage','security.view'],account_management_ai:['accounts.manage','accounts.view'],user_monitoring_ai:['monitoring.manage','monitoring.view'],monitoring_ai:['monitoring.manage','monitoring.view'],damage_control_ai:['security.manage','incident.manage'],help_support_ai:['support.help_ai','support.tickets.manage'],accounting_ai:['finance.view','finance.manage'],analytics_ai:['reports.view'],engagement_ai:['reports.view','content.manage'],creator_ai:['content.manage'],story_ai:['content.manage'],character_ai:['content.manage'],audio_ai:['content.manage'],comic_ai:['content.manage'],visual_ai:['content.manage'],quality_ai:['content.manage'],research_ai:['reports.view','content.manage'],safety_policy_ai:['moderation.manage','security.manage'],anti_spam_malware_ai:['security.manage'],reel_ai:['content.manage'],writing_ai:['content.manage'],media_security_ai:['security.manage'],cyber_defense_ai:['security.manage'],all_domain_master_intelligence_ai:['ai.governance'],designated_admin_ai:['ai.governance'],admin_ai:['ai.governance']};
const adminAIs=new Set(['ai_orchestrator','all_domain_master_intelligence_ai','designated_admin_ai','admin_ai','programmer_ai','design_ai','training_ai','user_monitoring_ai','monitoring_ai','damage_control_ai','account_management_ai','security_ai','anti_spam_malware_ai','help_support_ai','accounting_ai','engagement_ai','analytics_ai','reel_ai','story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','research_ai','safety_policy_ai','creator_ai','writing_ai','media_security_ai','cyber_defense_ai']);
const communicationTargets={
 ai_orchestrator:Object.keys(roles).filter(x=>x!=='ai_orchestrator'),
 all_domain_master_intelligence_ai:Object.keys(roles).filter(x=>x!=='master_admin_ai'),
 master_admin_ai:['all_domain_master_intelligence_ai','security_ai','programmer_ai','design_ai','quality_ai','safety_policy_ai','damage_control_ai','ai_orchestrator'],
 designated_admin_ai:['ai_orchestrator','help_support_ai','account_management_ai','security_ai','programmer_ai','design_ai'],admin_ai:['ai_orchestrator','help_support_ai','programmer_ai','design_ai','analytics_ai','accounting_ai'],
 story_ai:['character_ai','research_ai','quality_ai','safety_policy_ai','visual_ai','comic_ai','audio_ai','reel_ai','creator_ai'],character_ai:['story_ai','quality_ai','visual_ai','comic_ai','audio_ai','reel_ai'],audio_ai:['story_ai','character_ai','quality_ai','safety_policy_ai','creator_ai'],comic_ai:['story_ai','character_ai','visual_ai','quality_ai','safety_policy_ai','creator_ai'],visual_ai:['story_ai','character_ai','comic_ai','quality_ai','safety_policy_ai','creator_ai'],quality_ai:['story_ai','character_ai','audio_ai','comic_ai','visual_ai','research_ai','safety_policy_ai','programmer_ai','design_ai','creator_ai'],research_ai:['story_ai','character_ai','quality_ai','safety_policy_ai'],safety_policy_ai:['story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','research_ai','creator_ai','security_ai'],programmer_ai:['security_ai','quality_ai','design_ai','ai_orchestrator'],design_ai:['programmer_ai','quality_ai','visual_ai','creator_ai','ai_orchestrator'],creator_ai:['story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','safety_policy_ai','reel_ai'],training_ai:['all_domain_master_intelligence_ai','master_admin_ai','ai_orchestrator','quality_ai'],user_monitoring_ai:['monitoring_ai','anti_spam_malware_ai','damage_control_ai','account_management_ai','help_support_ai','security_ai'],monitoring_ai:['user_monitoring_ai','anti_spam_malware_ai','damage_control_ai','all_domain_master_intelligence_ai'],damage_control_ai:['security_ai','monitoring_ai','user_monitoring_ai','account_management_ai','master_admin_ai'],account_management_ai:['help_support_ai','security_ai','user_monitoring_ai','master_admin_ai'],security_ai:['programmer_ai','quality_ai','safety_policy_ai','anti_spam_malware_ai','damage_control_ai','account_management_ai','master_admin_ai'],anti_spam_malware_ai:['security_ai','user_monitoring_ai','monitoring_ai','damage_control_ai'],help_support_ai:['account_management_ai','security_ai','damage_control_ai','ai_orchestrator','designated_admin_ai','admin_ai'],accounting_ai:['analytics_ai','all_domain_master_intelligence_ai','master_admin_ai'],engagement_ai:['analytics_ai','creator_ai','all_domain_master_intelligence_ai'],analytics_ai:['engagement_ai','accounting_ai','creator_ai','all_domain_master_intelligence_ai'],reel_ai:['story_ai','character_ai','visual_ai','audio_ai','quality_ai','safety_policy_ai','creator_ai'],writing_ai:['story_ai','character_ai','creator_ai','quality_ai'],media_security_ai:['security_ai','visual_ai','audio_ai','comic_ai','reel_ai'],cyber_defense_ai:['security_ai','programmer_ai','monitoring_ai','damage_control_ai']};
for(const k of Object.keys(communicationTargets))communicationTargets[k]=new Set(communicationTargets[k]);
const audit=[];
function authorizeInvocation(role,{risk='low',permissions=[],actorRole=null,external=false}={}){
  const r=roles[role];if(!r||r.active===false||r.managed!==true)return false;
  if(external && r.externalAllowed!==true)return false;
  if(risk==='critical' && actorRole!=='master_admin')return false;
  if(actorRole==='user' && !publicUserAIs.has(role))return false;
  if(actorRole==='admin' && (!adminAIs.has(role)||!permissions.some(x=>['*','admin:*','ai.governance',`ai:${role}`,...(rolePermissionAliases[role]||[])].includes(String(x)))))return false;
  if(actorRole==='designated_admin' && !['ai_orchestrator','designated_admin_ai','help_support_ai'].includes(role))return false;
  if(actorRole==='master_admin' && !['ai_orchestrator','all_domain_master_intelligence_ai','master_admin_ai','designated_admin_ai','admin_ai','programmer_ai','design_ai','training_ai','user_monitoring_ai','monitoring_ai','damage_control_ai','account_management_ai','security_ai','anti_spam_malware_ai','help_support_ai','accounting_ai','engagement_ai','analytics_ai','reel_ai','story_ai','character_ai','audio_ai','comic_ai','visual_ai','quality_ai','research_ai','safety_policy_ai','creator_ai','writing_ai','media_security_ai','cyber_defense_ai'].includes(role))return false;
  audit.push({id:crypto.randomUUID(),event:'ai_invocation_authorized',role,risk,actorRole,external,at:new Date().toISOString()});
  return true;
}
function canApply(role,approval,category='general'){
  if(!approval||approval.approved!==true)return false;
  if(criticalCategories.has(String(category)))return approval.role==='master_admin';
  if(approval.role==='master_admin')return true;
  const rights=Array.isArray(approval.rightsGranted)?approval.rightsGranted:[];
  return role==='admin'&&rights.some(x=>['*','admin:*','ai.governance','ai:'+category].includes(String(x)));
}
function communicate(from,to,payload,context={}){
  if(!roles[from]||!roles[to])throw new Error('ai_role_not_registered');
  if(from===to||!communicationTargets[from]?.has(to))throw new Error('ai_communication_not_permitted');
  if(context.scope===undefined||context.scope===null||String(context.scope).trim()==='')throw new Error('ai_message_scope_required');
  const message={id:crypto.randomUUID(),from,to,payload:payload||{},context:{ticketId:context.ticketId||null,scope:String(context.scope).slice(0,160),risk:context.risk||'low',timestamp:new Date().toISOString()},policyChecked:true,managedBy:'ai_management'};
  audit.push(message);return message;
}
function workflow(){return ['observe','analyse','suggest','proposal','identity_permission_policy_check','memory_knowledge_retrieval','model_tool_route','human_approval_if_required','apply','test','verify','approved_knowledge_refresh','audit'];}
function status(){return Object.fromEntries(Object.entries(roles).map(([k,v])=>[k,{...v}]));}
function managementStatus(){return {managedBy:'ai_management',registryVersion:'KV30-P2-30W-ai-management-v4',totalAIs:Object.keys(roles).length,activeAIs:Object.values(roles).filter(x=>x.active).length,allManaged:Object.values(roles).every(x=>x.managed===true),externalDefault:'disabled_per_ai_until_master_policy_allows',tiers:{L1:Object.values(roles).filter(x=>x.tier==='L1').length,L2:Object.values(roles).filter(x=>x.tier==='L2').length},workflow:workflow()};}
function auditHistory(){return audit.map(x=>({...x}));}
module.exports={roles,canApply,authorizeInvocation,communicate,status,managementStatus,auditHistory,workflow,communicationTargets};
