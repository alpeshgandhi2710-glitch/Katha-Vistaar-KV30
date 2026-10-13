'use strict';
const fs=require('node:fs');
const path=require('node:path');

function createTaxGstProductionPolicy(root){
  const file=path.join(root,'config','tax-gst-production-matrix-v30.json');
  const read=()=>{if(process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG){try{return JSON.parse(process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG)}catch{}}try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
  const status=()=>{const cfg=read();return {configured:!!cfg,approved:cfg?.status==='APPROVED'&&cfg?.productionMatrix?.isApproved===true,version:cfg?.schemaVersion||null,approvalStatus:cfg?.status||'MISSING',entryCount:Array.isArray(cfg?.productionMatrix?.entries)?cfg.productionMatrix.entries.length:0,failClosed:cfg?.failClosedPolicy?.onMissingOrUnapproved||'BLOCK_MONETIZATION'};};
  const assertApproved=()=>{const cfg=read();if(!cfg||cfg.failClosedPolicy?.allowFallbackInvent!==false||cfg.status!=='APPROVED'||cfg.productionMatrix?.isApproved!==true)return {ok:false,status:409,error:'TAX_MATRIX_NOT_APPROVED',message:'GST/SAC production matrix is not approved. Monetization is blocked until the authorized Master Admin-approved legal matrix is present.'};return {ok:true,cfg};};
  function saveApproved(input,actor){
    if(!actor||String(actor.role)!=='master_admin')throw Object.assign(new Error('tax_matrix_master_admin_required'),{code:'tax_matrix_master_admin_required'});
    const previous=read()||{};
    const legalBasis=input?.legalBasis||{};
    const entries=Array.isArray(input?.entries)?input.entries:[];
    const sacHeading=String(legalBasis.sacHeading||'').trim();
    const sacGroup=String(legalBasis.sacGroup||'').trim();
    const exactClassification=String(legalBasis.exactClassification||'').trim();
    if(!sacHeading||!sacGroup||!exactClassification||exactClassification.includes('APPROVAL_REQUIRED')||!entries.length)
      throw Object.assign(new Error('tax_matrix_sac_and_entries_required'),{code:'tax_matrix_sac_and_entries_required'});
    for(const entry of entries){
      const rate=Number(entry?.rate);
      if(!String(entry?.transactionCategory||entry?.category||'').trim()||!String(entry?.ruleVersion||entry?.version||'').trim()||!String(entry?.effectiveFrom||'').trim()||!Number.isFinite(rate)||rate<0)
        throw Object.assign(new Error('tax_matrix_entry_category_version_effective_rate_required'),{code:'tax_matrix_entry_category_version_effective_rate_required'});
    }
    const sourceSnapshot=input?.sourceSnapshot&&typeof input.sourceSnapshot==='object'?input.sourceSnapshot:null;
    const next={
      schemaVersion:'v30',
      status:'APPROVED',
      legalBasis:{
        notificationNo:String(legalBasis.notificationNo||previous.legalBasis?.notificationNo||'').trim(),
        notificationDate:String(legalBasis.notificationDate||previous.legalBasis?.notificationDate||'').trim(),
        sacHeading,
        sacGroup,
        exactClassification
      },
      productionMatrix:{isApproved:true,approvedBy:String(actor.adminId||actor.role),approvedAt:new Date().toISOString(),entries},
      approvalEvidence:{
        legalReviewer:input?.legalReviewer||null,
        evidenceReferences:Array.isArray(input?.evidenceReferences)?input.evidenceReferences:[],
        sourceSnapshot,
        caReference:input?.caReference||null
      },
      failClosedPolicy:{onMissingOrUnapproved:'BLOCK_MONETIZATION',allowFallbackInvent:false}
    };
    const tmp=`${file}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n','utf8');fs.renameSync(tmp,file);return next;
  }

  return {file,read,status,assertApproved,saveApproved};
}
module.exports={createTaxGstProductionPolicy};
