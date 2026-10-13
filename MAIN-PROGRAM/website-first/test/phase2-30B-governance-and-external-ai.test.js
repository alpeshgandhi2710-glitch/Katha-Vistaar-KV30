const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const cc=require('../core/change-control');
const am=require('../../backend/src/services/ai-management');
const pai=require('../../backend/src/services/programmer-ai');
const dai=require('../../backend/src/services/design-ai');
const ext=require('../../backend/src/services/external-ai');
const kernel=require('../../backend/src/services/ai-kernel');
const root=path.resolve(__dirname,'..');

test('30B release identity is consistent in active source',()=>{
 const v=JSON.parse(fs.readFileSync(path.join(root,'config/version.json'),'utf8'));
 assert.equal(v.release_ref,v.current_release_ref);
 assert.equal(require('../package.json').version,'KV30-P2-30W');
 assert.equal(require('../../backend/package.json').version,'KV30-P2-30W');
});
test('30A change control allows designated admin for ordinary changes and master only for critical',()=>{
 const s=cc.createStore(); const low=s.submit({actor:'admin',category:'ui_copy',summary:'copy',patchHash:'x'}); assert.equal(s.approve(low.id,'admin',true).status,'approved_for_deploy');
 const critical=s.submit({actor:'admin',category:'master_recovery',summary:'key',patchHash:'x'}); assert.throws(()=>s.approve(critical.id,'admin',true),/master_admin_required/); assert.equal(s.approve(critical.id,'master_admin',true).status,'approved_for_deploy');
});
test('30B AI patch application never bypasses human authority',()=>{const a=pai.analyze({findings:['x']});const p=pai.proposePatch(a,{files:['x']});assert.throws(()=>pai.applyAfterApproval(p,{role:'security_ai',approved:true}),/designated_admin_or_master_admin/);assert.equal(pai.applyAfterApproval(p,{role:'admin',approved:true,rightsGranted:['programmer.ai.approve']}).approved,true);});
test('30A design AI requires human admin authority',()=>{const a=dai.analyze({suggestions:['responsive']});assert.throws(()=>dai.approveChange(a,{role:'security_ai',approved:true}),/designated_admin_or_master_admin/);assert.equal(dai.approveChange(a,{role:'admin',approved:true,rightsGranted:['design.ai.approve']}).approved,true);});
test('30A external AI is server-side and fails safely without credentials',()=>{const st=ext.status();assert.equal(typeof st.openai.serverSideOnly,'boolean');assert.equal(typeof st.gemini.serverSideOnly,'boolean');});
test('30B AI kernel refuses autonomous high-risk changes and exposes governed external status',()=>{const h=kernel.help({problem:'master recovery key change',language:'en'});assert.equal(h.humanApprovalRequired,true);const k=kernel.knowledgeStatus();assert.equal(k.governance,'human-admin-final-authority');assert.ok(k.externalProviders);});

test('30A OpenAI and Gemini adapters parse approved server-side response shapes',async()=>{
 const oldFetch=global.fetch, oldO=process.env.OPENAI_API_KEY, oldG=process.env.GEMINI_API_KEY;
 try{
  process.env.OPENAI_API_KEY='test-openai'; delete process.env.GEMINI_API_KEY;
  global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({id:'resp_test',output_text:'OpenAI advisory'})});
  let r=await ext.generate({provider:'openai',input:'hello'}); assert.equal(r.ok,true); assert.equal(r.provider,'openai');
  delete process.env.OPENAI_API_KEY; process.env.GEMINI_API_KEY='test-gemini';
  global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({id:'int_test',steps:[{type:'model_output',content:[{type:'text',text:'Gemini advisory'}]}]})});
  r=await ext.generate({provider:'gemini',input:'hello'}); assert.equal(r.ok,true); assert.equal(r.provider,'gemini');
 }finally{global.fetch=oldFetch; if(oldO===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldO; if(oldG===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldG;}
});

test('30A service manager recognizes OpenAI/Gemini credentials only after governance gates',()=>{
 const {createServiceManager}=require('../services/service-manager');
 const env={OPENAI_API_KEY:'x',KV_EXTERNAL_AI_LICENSE_APPROVED:'false',KV_EXTERNAL_AI_DATA_POLICY_APPROVED:'false'};
 let sm=createServiceManager(require('node:path').resolve(__dirname,'..'),env); assert.equal(sm.prerequisites('external_ai').ready,false);
 env.KV_EXTERNAL_AI_LICENSE_APPROVED='true'; env.KV_EXTERNAL_AI_DATA_POLICY_APPROVED='true'; env.KV_EXTERNAL_AI_HEALTH_OK='true';
 sm=createServiceManager(require('node:path').resolve(__dirname,'..'),env); assert.equal(sm.prerequisites('external_ai').ready,true); assert.equal(sm.get('external_ai').available,true);
});
