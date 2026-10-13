'use strict';
const fs=require('node:fs');
const path=require('node:path');
const POLICY_PATH=path.join(__dirname,'..','config','content-access-policy-v30.json');
const BUNDLE_MEMBERSHIP_PATH=path.join(__dirname,'..','config','bundle-entitlement-membership-v30.json');
const COMPLIMENTARY_ENTITLEMENT_PATH=path.join(__dirname,'..','config','complimentary-entitlement-v30.json');
function loadPolicy(){
  try{return JSON.parse(fs.readFileSync(POLICY_PATH,'utf8'));}
  catch(e){throw Object.assign(new Error('content_access_policy_config_required'),{code:'content_access_policy_config_required',cause:e});}
}
const POLICY=loadPolicy();
function loadBundleMembership(){
  try{return JSON.parse(fs.readFileSync(BUNDLE_MEMBERSHIP_PATH,'utf8'));}
  catch(e){throw Object.assign(new Error('bundle_membership_config_required'),{code:'bundle_membership_config_required',cause:e});}
}
const BUNDLE_MEMBERSHIP=loadBundleMembership();
function loadComplimentaryEntitlementConfig(){
  try{return JSON.parse(fs.readFileSync(COMPLIMENTARY_ENTITLEMENT_PATH,'utf8'));}
  catch(e){throw Object.assign(new Error('complimentary_entitlement_config_required'),{code:'complimentary_entitlement_config_required',cause:e});}
}
const COMPLIMENTARY_ENTITLEMENT=loadComplimentaryEntitlementConfig();
const novelPolicy=()=>POLICY?.stories?.novel||{};
const mediaPolicy=(type)=>type==='audio'?(POLICY?.fm||{}):(POLICY?.[type==='reel'?'reels':type]||{});
function hasSub(user,key){return !!user?.subscriptions?.[key]}
function activePlanSubscription(user,policy,planId,nowMs=Date.now()){
  const key=String(planId); const record=user?.subscriptionRecords?.[key];
  if(!record||record.planId!==key||record.status!=='active')return null;
  const configured=(Array.isArray(policy?.subscriptions)?policy.subscriptions:[]).find(p=>String(p.id)===key);
  const plan=record.planSnapshot||configured;
  if(!plan)return null;
  const expires=record.expiresAt?Date.parse(record.expiresAt):NaN;
  if(Number.isFinite(expires)&&expires<=nowMs)return null;
  if(record.cancelAtPeriodEnd&&Number.isFinite(Date.parse(record.cancelAtPeriodEnd))&&Date.parse(record.cancelAtPeriodEnd)<=nowMs)return null;
  return {record,plan};
}
function recordContentEntitlement(record,content,membershipTable=BUNDLE_MEMBERSHIP){
  if(!record||record.status!=='active'||!content)return false;
  const plan=record.planSnapshot||{};
  const contentId=String(content.id||'');
  if(String(plan.type||'').toLowerCase()==='bundle'){
    const bundleId=String(plan.bundleId||'').trim();
    if(!bundleId)return false;
    const bundles=Array.isArray(membershipTable?.bundles)?membershipTable.bundles:[];
    const bundle=bundles.find(x=>String(x?.bundleId||'').trim()===bundleId && x?.active!==false);
    const ids=Array.isArray(bundle?.contentIds)?bundle.contentIds.map(String):[];
    return !!bundle && ids.includes(contentId);
  }
  const ids=Array.isArray(plan.contentIds)?plan.contentIds.map(String):[];
  return ids.includes(contentId);
}
function validComplimentaryRecord(record,user,nowMs=Date.now(),membershipTable=BUNDLE_MEMBERSHIP){
  if(!record||record.userId==null||String(record.userId)!==String(user?.id||user?.userId||''))return false;
  if(!record.entitlementId||record.source!=='admin_grant'||!record.grantedBy||!record.grantedAt||record.isRevocable!==true)return false;
  if(Number(record.price)!==0||Number(record.royalty)!==0)return false;
  if(record.revokedAt)return false;
  if(record.expiry!=null){const expiry=Date.parse(record.expiry);if(!Number.isFinite(expiry)||expiry<=nowMs)return false;}
  const type=String(record.type||'').toLowerCase();
  const contentIds=Array.isArray(record.contentIds)?record.contentIds.map(String):[];
  if(type==='complimentary_content')return contentIds.length>0;
  if(type==='complimentary_bundle'){
    const bundleId=String(record.bundleId||'').trim(); if(!bundleId)return false;
    const bundles=Array.isArray(membershipTable?.bundles)?membershipTable.bundles:[];
    const bundle=bundles.find(x=>String(x?.bundleId||'').trim()===bundleId&&x?.active!==false);
    const ids=Array.isArray(bundle?.contentIds)?bundle.contentIds.map(String):[];
    return !!bundle&&ids.length>0;
  }
  return false;
}
function recordComplimentaryEntitlement(record,user,content,nowMs=Date.now(),membershipTable=BUNDLE_MEMBERSHIP){
  if(!validComplimentaryRecord(record,user,nowMs,membershipTable)||!content)return false;
  const type=String(record.type||'').toLowerCase(), contentId=String(content.id||'');
  if(type==='complimentary_content')return (record.contentIds||[]).map(String).includes(contentId);
  if(type==='complimentary_bundle'){
    const bundleId=String(record.bundleId||'').trim();
    const bundles=Array.isArray(membershipTable?.bundles)?membershipTable.bundles:[];
    const bundle=bundles.find(x=>String(x?.bundleId||'').trim()===bundleId&&x?.active!==false);
    const ids=Array.isArray(bundle?.contentIds)?bundle.contentIds.map(String):[];
    return !!bundle&&ids.includes(contentId);
  }
  return false;
}
function hasComplimentaryEntitlement(user,content,nowMs=Date.now(),membershipTable=BUNDLE_MEMBERSHIP){
  const records=Array.isArray(user?.complimentaryEntitlements)?user.complimentaryEntitlements:Object.values(user?.complimentaryEntitlements||{});
  return records.some(record=>recordComplimentaryEntitlement(record,user,content,nowMs,membershipTable));
}
function hasContentEntitlement(user,content,nowMs=Date.now(),membershipTable=BUNDLE_MEMBERSHIP){
  return Object.values(user?.subscriptionRecords||{}).some(record=>{
    if(!recordContentEntitlement(record,content,membershipTable))return false;
    const expires=record.expiresAt?Date.parse(record.expiresAt):NaN;
    if(Number.isFinite(expires)&&expires<=nowMs)return false;
    if(record.cancelAtPeriodEnd&&Number.isFinite(Date.parse(record.cancelAtPeriodEnd))&&Date.parse(record.cancelAtPeriodEnd)<=nowMs)return false;
    return true;
  });
}
function authorSubscriptionRecord(user,authorId,nowMs=Date.now()){
  const key=`author_subscription:${String(authorId||'')}`;
  const r=user?.subscriptionRecords?.[key];
  if(!r||r.planId!=='author_subscription'||r.authorId!==String(authorId||'')||r.status!=='active')return null;
  const expires=Date.parse(r.expiresAt||'');
  if(!Number.isFinite(expires)||expires<=nowMs)return null;
  if(r.cancelAtPeriodEnd&&Number.isFinite(Date.parse(r.cancelAtPeriodEnd))&&Date.parse(r.cancelAtPeriodEnd)<=nowMs)return null;
  return r;
}
function hasAuthorSubscription(user,authorId,nowMs=Date.now()){return !!authorSubscriptionRecord(user,authorId,nowMs)}
function hasPolicyScope(user,policy,scope){const records=Object.values(user?.subscriptionRecords||{});if(records.some(r=>r?.status==='active'&&String(r.accessScope||r.planSnapshot?.accessScope||'')===String(scope)))return true;const plans=Array.isArray(policy?.subscriptions)?policy.subscriptions:[];return plans.some(p=>p.active&&p.accessScope===scope&&p.entitlementKey&&hasSub(user,p.entitlementKey))}
function decide(user,content,nowMs=Date.now(),membershipTable=BUNDLE_MEMBERSHIP){
  if(!user)return {allowed:false,reason:'login_required',requiresLogin:true,adFree:false};
  const type=String(content?.type||''), part=Math.max(1,Number(content?.partNumber||1)), work=String(content?.workType||'').toLowerCase();
  const policy=globalThis.__KV_MANAGED_POLICY__||null; if(hasComplimentaryEntitlement(user,content,nowMs,membershipTable))return {allowed:true,reason:'complimentary_entitlement',adFree:false}; if(hasContentEntitlement(user,content,nowMs,membershipTable))return {allowed:true,reason:'content_entitlement',adFree:false}; const app=hasSub(user,'appReader')||hasSub(user,'app_reader')||hasPolicyScope(user,policy,'app');
  const platform=activePlanSubscription(user,policy,'platform_subscription',nowMs);
  const platformAdFree=!!platform?.plan?.adFree;
  if(type==='story'&&work!=='novel')return {allowed:true,reason:'non_serial_story',adFree:app||platformAdFree};
  if(type==='story'&&work==='novel'){
    const np=novelPolicy(); if(!Number.isFinite(Number(np.freeParts))||!Number.isFinite(Number(np.dailyProgressHours))||!Number.isFinite(Number(np.coinUnlockCost))||typeof np.rewardedAdUnlock!=='boolean')throw Object.assign(new Error('content_access_policy_values_required'),{code:'content_access_policy_values_required'}); const freeParts=Math.max(0,Number(np.freeParts)), dailyHours=Math.max(0,Number(np.dailyProgressHours)), coinUnlockCost=Math.max(0,Number(np.coinUnlockCost)), rewardedAdUnlock=np.rewardedAdUnlock===true;
    const sid=content.seriesId||content.id, state=user?.readerAccess?.novel?.[sid]||{};
    const unlocked=new Set(state.unlockedParts||[]);
    if(part<=freeParts)return {allowed:true,reason:`novel_first_${freeParts}_free`,adFree:app||platformAdFree};
    if(platform)return {allowed:true,reason:'platform_subscription',adFree:platformAdFree};
    if(app)return {allowed:true,reason:'app_subscription',adFree:true};
    if(hasAuthorSubscription(user,content.ownerId,nowMs))return {allowed:true,reason:'author_subscription',adFree:false};
    if(unlocked.has(part))return {allowed:true,reason:'permanent_unlock',adFree:app||platformAdFree};
    const last=Number(state.lastReadPart||0), eligible=state.nextEligibleAt?Date.parse(state.nextEligibleAt):NaN;
    if(last>=freeParts&&part===last+1&&Number.isFinite(eligible)&&nowMs>=eligible)return {allowed:true,reason:'daily_progress_unlock',adFree:app||platformAdFree,nextEligibleAt:null};
    return {allowed:false,reason:'novel_locked',coinUnlockCost,rewardedAdUnlock,nextEligibleAt:state.nextEligibleAt||null,adSupported:rewardedAdUnlock,adFree:app||platformAdFree,dailyProgressHours:dailyHours};
  }
  if(['comic','audio','reel'].includes(type)){
    const p=mediaPolicy(type), noAppFreeParts=Math.max(0,Number(p.noAppFreeParts||0)), appFreeParts=Math.max(0,Number(p.appFreeParts||0)), subscription=type==='audio'?'audioReader':`${type}Reader`, legacyAlias=type==='audio'?'fm_reader':type+'_reader';
    const format=hasSub(user,subscription)||hasSub(user,legacyAlias)||hasPolicyScope(user,policy,type), formatPlan=activePlanSubscription(user,policy,subscription,nowMs)||activePlanSubscription(user,policy,legacyAlias,nowMs)||((format&&app)?{plan:{adFree:true}}:null), free=format?Number.POSITIVE_INFINITY:(app?appFreeParts:noAppFreeParts);
    if(platform)return {allowed:true,reason:'platform_subscription',adFree:platformAdFree};
    if(format)return {allowed:true,reason:`${type}_subscription`,adFree:!!formatPlan?.plan?.adFree||app};
    if(part<=free)return {allowed:true,reason:app?`${type}_app_subscription_free_counter`:`${type}_first_${Number.isFinite(free)?free:0}_free`,adFree:app||platformAdFree};
    return {allowed:false,reason:`${type}_subscription_required`,subscription,freeParts:free,adFree:app||platformAdFree};
  }
  return {allowed:true,reason:'default_login_content',adFree:app||platformAdFree};
}
module.exports={POLICY,BUNDLE_MEMBERSHIP,COMPLIMENTARY_ENTITLEMENT,decide,authorSubscriptionRecord,hasAuthorSubscription,activePlanSubscription,recordContentEntitlement,hasContentEntitlement,recordComplimentaryEntitlement,hasComplimentaryEntitlement};
