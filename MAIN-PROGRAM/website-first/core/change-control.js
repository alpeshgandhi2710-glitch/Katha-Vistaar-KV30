'use strict';
const crypto=require('node:crypto');
const MASTER_ONLY=new Set(['production_code','security_policy','role_policy','backup_recovery','privacy_policy','master_recovery','secrets','product_keys']);
const HIGH_RISK=new Set(['production_code','payment_logic','entitlement_logic','financial_adjustment','deploy_code']);
function approvalRole(category){if(MASTER_ONLY.has(category))return 'master_admin';return 'admin_or_master_admin';}
function createStore(){const requests=new Map();return {
 submit({actor,category,summary,patchHash,tests=[]}){const r={id:'CR-'+crypto.randomBytes(6).toString('hex').toUpperCase(),actor,category,summary,patchHash,tests,status:'pending_human_approval',createdAt:new Date().toISOString(),approval:null};requests.set(r.id,r);return {...r};},
 approve(id,approver,approved){const r=requests.get(id);if(!r)throw new Error('change_request_not_found');const required=approvalRole(r.category);if(required==='master_admin'&&approver!=='master_admin')throw new Error('master_admin_required');if(!['admin','master_admin'].includes(approver))throw new Error('human_admin_required');r.status=approved?'approved_for_deploy':'rejected';r.approval={by:approver,approved,at:new Date().toISOString(),required};return {...r};},
 list(){return [...requests.values()].map(x=>({...x}));}
};}
module.exports={MASTER_ONLY,HIGH_RISK,approvalRole,createStore};
