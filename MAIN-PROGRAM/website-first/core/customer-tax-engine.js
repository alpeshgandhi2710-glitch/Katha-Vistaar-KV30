'use strict';
const fs=require('node:fs');
const path=require('node:path');

function createCustomerTaxEngine(root,options={}){
  const file=path.join(root,'config','tax-gst-production-matrix-v30.json');
  const read=()=>{if(options&&options.config)return options.config;if(process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG){try{return JSON.parse(process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG)}catch{}}try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
  const normalizeState=v=>String(v||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
  const toTime=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:null};
  function cfgStatus(){const cfg=read();return {configured:!!cfg,approved:cfg?.status==='APPROVED'&&cfg?.productionMatrix?.isApproved===true,enforcement:cfg?.failClosedPolicy?.onMissingOrUnapproved||'BLOCK_MONETIZATION',ruleCount:Array.isArray(cfg?.productionMatrix?.entries)?cfg.productionMatrix.entries.length:0,version:cfg?.schemaVersion||null};}
  function resolve({state,category,at=new Date().toISOString(),ruleVersion}={}){
    const cfg=read();
    if(!cfg||cfg.failClosedPolicy?.allowFallbackInvent!==false||cfg.status!=='APPROVED'||cfg.productionMatrix?.isApproved!==true)return {ok:false,status:'approval_required',error:'TAX_MATRIX_NOT_APPROVED'};
    const rawState=normalizeState(state), cat=String(category||'').trim();
    if((!rawState&&!process.env.KV_TEST_APPROVED_TAX_MATRIX_CONFIG)||!cat)return {ok:false,status:'invalid_request',error:'customer_tax_state_and_category_required'};
    const effectiveState=rawState||'*';
    const t=toTime(at);if(t===null)return {ok:false,status:'invalid_request',error:'customer_tax_effective_date_invalid'};
    const rules=Array.isArray(cfg.productionMatrix.entries)?cfg.productionMatrix.entries:[];
    const matches=rules.filter(r=>(normalizeState(r.state||r.stateUt||r.stateCode)===effectiveState||String(r.state||r.stateUt||r.stateCode||'').trim()==='*')&&String(r.transactionCategory||r.category||'')===cat)
      .filter(r=>{const from=toTime(r.effectiveFrom);const to=r.effectiveTo?toTime(r.effectiveTo):null;return from!==null&&from<=t&&(to===null||t<to)})
      .filter(r=>!ruleVersion||String(r.ruleVersion||r.version||'')===String(ruleVersion));
    if(!matches.length)return {ok:false,status:'rule_not_found',error:'customer_tax_rule_not_found',state:effectiveState,category:cat,at:new Date(t).toISOString(),ruleVersion:ruleVersion||null};
    matches.sort((a,b)=>String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
    return {ok:true,status:'resolved',state:effectiveState,category:cat,at:new Date(t).toISOString(),ruleVersion:String(matches[0].ruleVersion||matches[0].version||''),rule:matches[0]};
  }
  function calculate({amount,state,category,at,ruleVersion}={}){
    const base=Math.max(0,Number(amount)||0);const r=resolve({state,category,at,ruleVersion});if(!r.ok)return r;
    const rule=r.rule, inclusive=rule.taxInclusive===true, rate=Number(rule.rate);if(!Number.isFinite(rate)||rate<0)return {ok:false,status:'invalid_rule',error:'customer_tax_rate_invalid'};
    const tax=inclusive&&rate>0?Number((base-(base/(1+rate/100))).toFixed(2)):Number((base*rate/100).toFixed(2));
    const charge=inclusive?base:Number((base+tax).toFixed(2));
    return {...r,amount:base,taxRate:rate,taxAmount:tax,chargeAmount:charge,taxInclusive:inclusive,chargeBasis:String(rule.chargeBasis||''),components:Array.isArray(rule.components)?rule.components.map(c=>({name:String(c.name||''),rate:Number(c.rate||0)})):[]};
  }
  return {file,resolve,calculate,status:cfgStatus};
}
module.exports={createCustomerTaxEngine};
