const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const externalFirewall=require('../../backend/src/services/external-gate-firewall.js');

function createServiceManager(root, env=process.env){
  const configPath=path.join(root,'config','service-registry-v30.json');
  const matrixPath=path.join(root,'config','external-service-two-switch-matrix-v30.json');
  const matrixConfig=JSON.parse(fs.readFileSync(matrixPath,'utf8'));
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const capabilityServicePath=path.join(root,'config','comic-lora-external-service-v30.json');
  let capabilityServiceConfig=null;try{capabilityServiceConfig=JSON.parse(fs.readFileSync(capabilityServicePath,'utf8'));}catch{}
  if(capabilityServiceConfig?.serviceId&&capabilityServiceConfig?.serviceSpec&&!config.services[capabilityServiceConfig.serviceId])config.services[capabilityServiceConfig.serviceId]=capabilityServiceConfig.serviceSpec;
  const state=new Map();
  const testMode=process.argv.some(x=>String(x).includes('/tests/'))||process.argv.includes('--test')||String(env.NODE_ENV||'').toLowerCase()==='test';
  const statePath=testMode?path.join(require('node:os').tmpdir(),'katha-vistaar-tests',`external-service-state-${process.pid}.json`):path.join(root,'data','external-service-state-v30.json');
  const loadManual=()=>{try{const x=JSON.parse(fs.readFileSync(statePath,'utf8'));return x&&typeof x==='object'?x:{}}catch{return {}}};
  const saveManual=(x)=>{fs.mkdirSync(path.dirname(statePath),{recursive:true});const tmp=statePath+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(x,null,2)+'\n','utf8');fs.renameSync(tmp,statePath)};
  const manualState=loadManual();
  const truthy=v=>['1','true','yes','on','enabled','ok','ready'].includes(String(v??'').toLowerCase());
  const envReady=(id,spec)=>{if(id==='external_ai')return Boolean(String(env.OPENAI_API_KEY||'').trim()||String(env.GEMINI_API_KEY||'').trim()||String(env.KV_AI_API_KEY||'').trim());return Array.isArray(spec.providerEnv)&&spec.providerEnv.every(k=>String(env[k]??'').trim());};
  const endpointFor=(id,spec)=>{
    if(id==='external_ai'){
      if(String(env.OPENAI_API_KEY||'').trim())return 'https://api.openai.com/v1/responses';
      if(String(env.GEMINI_API_KEY||'').trim())return 'https://generativelanguage.googleapis.com/v1beta/interactions';
    }
    const explicit=String(env[`KV_${id.toUpperCase()}_ENDPOINT`]||'').trim();
    if(explicit)return explicit;
    const legacy=String(env[`KV_${id.toUpperCase()}_PROVIDER`]||'').trim();
    return /^https?:\/\//i.test(legacy)?legacy:'';
  };
  const licenseReady=id=>truthy(env[`KV_${id.toUpperCase()}_LICENSE_APPROVED`]);
  const dataPolicyReady=id=>truthy(env[`KV_${id.toUpperCase()}_DATA_POLICY_APPROVED`]);
  const prereqsReady=(id,spec)=>envReady(id,spec)&&(!spec.requiresLicenseGate||licenseReady(id))&&(!spec.requiresDataPolicyGate||dataPolicyReady(id));
  const initialHealth=(id,spec)=>{
    if(!prereqsReady(id,spec))return {passed:false,reason:'provider_not_configured'};
    if(truthy(env[`KV_${id.toUpperCase()}_HEALTH_OK`]))return {passed:true,reason:'health_override_for_test'};
    return {passed:false,reason:endpointFor(id,spec)?'health_check_required':'endpoint_not_configured'};
  };
  const make=(id,spec,manual=null,health=null,desiredOverride=null)=>{
    const h=health||initialHealth(id,spec);
    const available=prereqsReady(id,spec)&&h.passed;
    const enabled=manual===null?Boolean(spec.defaultEnabled&&available):Boolean(manual)&&available;
    const externalGate=spec.externalGate||null;
    return {
      id,label:spec.label||id,enabled,desiredEnabled:desiredOverride===null?(manual===null?Boolean(spec.defaultEnabled):Boolean(manual)):Boolean(desiredOverride),available,mode:enabled?'on':(available?'off':'fallback'),
      provider:String(env[`KV_${id.toUpperCase()}_PROVIDER`]||'')||null,
      endpoint: endpointFor(id,spec)||null,
      fallback:spec.fallback||'internal_fallback',requiredFor:spec.requiredFor||[],
      requiresLicenseGate:!!spec.requiresLicenseGate,requiresDataPolicyGate:!!spec.requiresDataPolicyGate,
      internalLayer:'always_on',externalLayer:'master_admin_controlled',externalEnabled:enabled,firewallRequired:spec.firewallRequired!==false,externalGate,
      health:h,checkedAt:new Date().toISOString()
    };
  };
  for(const [id,spec] of Object.entries(config.services)){
    const persisted=Object.prototype.hasOwnProperty.call(manualState,id)?Boolean(manualState[id]):null;
    const startupActive=persisted===null?null:false;
    state.set(id,make(id,spec,startupActive,null,persisted));
  }

  function status(){return [...state.values()].map(x=>({...x,health:{...(x.health||{})}}));}
  function get(id){return state.get(id)||null;}
  function prerequisites(id){
    const spec=config.services[id]; if(!spec)return {ready:false,reason:'service_not_found'};
    if(!envReady(id,spec))return {ready:false,reason:'credentials_not_configured'};
    if(spec.requiresLicenseGate&&!licenseReady(id))return {ready:false,reason:'licence_gate_not_approved'};
    if(spec.requiresDataPolicyGate&&!dataPolicyReady(id))return {ready:false,reason:'data_policy_gate_not_approved'};
    return {ready:true,reason:'ready'};
  }
  async function healthCheck(id){
    const spec=config.services[id]; if(!spec)throw Object.assign(new Error('service_not_found'),{code:'service_not_found'});
    const pre=prerequisites(id); if(!pre.ready){state.set(id,make(id,spec,false,{passed:false,reason:pre.reason}));return state.get(id);}
    if(truthy(env[`KV_${id.toUpperCase()}_HEALTH_OK`])){state.set(id,make(id,spec,false,{passed:true,reason:'health_override_for_test'}));return state.get(id);}
    const endpoint=endpointFor(id,spec);
    if(id==='external_ai'){
      if(String(env.NODE_ENV||'').toLowerCase()==='test'||process.argv.includes('--test')||process.argv.some(x=>String(x).includes('/tests/'))){state.set(id,make(id,spec,false,{passed:false,reason:'health_check_required_in_test'}));return state.get(id);}
      try{
        const timeoutMs=Math.max(500,Number(env.KV_SERVICE_HEALTH_TIMEOUT_MS||5000));
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
        let r;
        if(String(env.OPENAI_API_KEY||'').trim()) r=await fetch('https://api.openai.com/v1/models',{headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},signal:controller.signal});
        else if(String(env.GEMINI_API_KEY||'').trim()) r=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':env.GEMINI_API_KEY},signal:controller.signal});
        else r=null;
        clearTimeout(timer); const passed=!!r&&r.ok; state.set(id,make(id,spec,false,{passed,reason:passed?'health_ok':`health_http_${r?.status||0}`,status:r?.status||0}));
      }catch(e){state.set(id,make(id,spec,false,{passed:false,reason:e.name==='AbortError'?'health_timeout':`health_error:${String(e.message||e).slice(0,120)}`}));}
      return state.get(id);
    }
    if(!endpoint){
      state.set(id,make(id,spec,false,{passed:false,reason:'endpoint_not_configured'}));return state.get(id);
    }
    const healthUrl=String(env[`KV_${id.toUpperCase()}_HEALTH_URL`]||`${endpoint.replace(/\/$/,'')}${spec.healthPath||'/health'}`);
    const timeoutMs=Math.max(500,Number(env.KV_SERVICE_HEALTH_TIMEOUT_MS||5000));
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
      const r=await fetch(healthUrl,{method:'GET',headers:{'Authorization':`Bearer ${env[`KV_${id.toUpperCase()}_API_KEY`]||''}`},signal:controller.signal});
      clearTimeout(timer);
      const passed=r.ok;
      state.set(id,make(id,spec,false,{passed,reason:passed?'health_ok':`health_http_${r.status}`,status:r.status}));
    }catch(e){
      state.set(id,make(id,spec,false,{passed:false,reason:e.name==='AbortError'?'health_timeout':`health_error:${String(e.message||e).slice(0,120)}`}));
    }
    return state.get(id);
  }
  function toggle(id,on,role){
    if(role!=='master_admin')throw Object.assign(new Error('master_admin_required'),{code:'master_admin_required'});
    const spec=config.services[id];if(!spec)throw Object.assign(new Error('service_not_found'),{code:'service_not_found'});
    const current=state.get(id)||make(id,spec,null);
    if(on){const pre=prerequisites(id);if(!pre.ready)throw Object.assign(new Error('service_prerequisites_not_ready'),{code:'service_prerequisites_not_ready'});if(!current.available)throw Object.assign(new Error('service_health_check_required'),{code:'service_health_check_required'});}
    state.set(id,make(id,spec,Boolean(on),current.health));
    manualState[id]=Boolean(on); saveManual(manualState); return state.get(id);
  }
  async function toggleAsync(id,on,role){
    if(role!=='master_admin')throw Object.assign(new Error('master_admin_required'),{code:'master_admin_required'});
    if(on)await healthCheck(id);
    return toggle(id,on,role);
  }
  function providerSlotStatus(serviceId,slot){
    const id=String(serviceId||''); const n=Math.max(1,Math.min(3,Number(slot)||1));
    const slotsFile=path.join(root,'config','external-provider-slots-v30.json');
    let cfg={slots:[]};try{cfg=JSON.parse(fs.readFileSync(slotsFile,'utf8'));}catch{}
    const row=(cfg.slots||[]).find(x=>x.service===id&&Number(x.slot)===n);
    if(!row)return {ok:false,reason:'provider_slot_not_found',service:id,slot:n};
    return {ok:true,...row,configured:Boolean(String(env[row.endpointEnv]||'').trim()&&String(env[row.credentialEnv]||'').trim()),enabled:false};
  }
  async function safeCallProviderAsync(serviceId,slot,externalFn,internalFallback,context={}){
    const slotInfo=providerSlotStatus(serviceId,slot); const s=get(serviceId);
    if(!slotInfo.ok)return {ok:false,service:serviceId,slot:Number(slot),mode:'internal_fallback',layer:'internal',value:internalFallback,error:slotInfo.reason};
    if(!s?.enabled)return {ok:false,service:serviceId,slot:Number(slot),mode:'internal',layer:'internal',value:internalFallback,reason:'canonical_service_external_off'};
    if(!slotInfo.configured)return {ok:false,service:serviceId,slot:Number(slot),mode:'internal_fallback',layer:'internal',value:internalFallback,reason:'provider_slot_not_configured'};
    const fw=externalFirewall.authorizeTwoSided({gateId:slotInfo.gate,serviceId,externalEnabled:true,serviceSwitchActive:!!s?.enabled,actor:context.actor||'master_admin',input:context.input||'',memoryTarget:context.memoryTarget||null,idempotencyKey:context.idempotencyKey||`provider:${serviceId}:${slotInfo.slot}:${Date.now()}`,timeoutMs:context.timeoutMs||12000});
    if(!fw.ok)return {ok:false,service:serviceId,slot:Number(slot),mode:'internal_fallback',layer:'internal',value:internalFallback,firewall:fw};
    try{return {ok:true,service:serviceId,slot:Number(slot),mode:'live',layer:'external',value:await externalFn(),firewall:'passed'};}
    catch(error){externalFirewall.recordFailure(slotInfo.gate,String(error.message||error));return {ok:false,service:serviceId,slot:Number(slot),mode:'internal_fallback',layer:'internal',value:internalFallback,errorId:crypto.createHash('sha256').update(String(error.message||error)).digest('hex').slice(0,12)};}
  }
  function twoSwitchMatrix(){ return JSON.parse(JSON.stringify(matrixConfig)); }
  function matrixEntry(id){ return (matrixConfig.services||[]).find(x=>x.serviceId===id) || (matrixConfig.reservedServiceBindings||[]).find(x=>x.serviceId===id) || (id==='comic_lora'?capabilityServiceConfig?.twoSwitchMatrixEntry||null:null); }
  async function safeCallWithFallbackAsync(id,externalFns=[],internalFallback,context={}){
    const m=matrixEntry(id);
    if(!m)return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,reason:'service_not_in_two_switch_matrix'};
    const fns=Array.isArray(externalFns)?externalFns:[];
    const attempts=[];
    for(let i=0;i<fns.length;i++){
      if(typeof fns[i]!=='function')continue;
      const slot=i===0?null:i;
      let result;
      if(slot===null) result=await safeCallAsync(id,fns[i],internalFallback,{...context,idempotencyKey:context.idempotencyKey||`matrix:${id}:primary:${Date.now()}`});
      else result=await safeCallProviderAsync(id,slot,fns[i],internalFallback,{...context,idempotencyKey:context.idempotencyKey||`matrix:${id}:slot:${slot}:${Date.now()}`});
      attempts.push({index:i,ok:!!result.ok,mode:result.mode,reason:result.reason||result.error||null});
      if(result.ok)return {...result,attempts,failureOrder:m.failureOrder};
    }
    return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,attempts,failureOrder:m.failureOrder,reason:'all_external_paths_failed_or_unavailable'};
  }
  function capability(id){
    const s=get(id);
    return s?.enabled
      ? {enabled:true,mode:'live',service:id,layer:'external'}
      : {enabled:false,mode:s?.available?'off':'fallback',service:id,layer:'internal',fallback:s?.fallback||'feature_unavailable'};
  }
  async function safeCallAsync(id,externalFn,internalFallback,context={}){
    const s=get(id);
    if(!s?.enabled)return {ok:false,service:id,mode:'internal',layer:'internal',value:internalFallback};
    if(s.firewallRequired!==false){
      if(!s.externalGate)return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,error:'external_gate_not_mapped'};
      const fw=externalFirewall.authorizeTwoSided({gateId:s.externalGate,serviceId:id,externalEnabled:true,serviceSwitchActive:!!s.enabled,actor:context.actor||'master_admin',input:context.input||'',memoryTarget:context.memoryTarget||null,idempotencyKey:context.idempotencyKey||`service:${id}:${Date.now()}`,timeoutMs:context.timeoutMs||12000});
      if(!fw.ok)return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,firewall:fw};
    }
    try{return {ok:true,service:id,mode:'live',layer:'external',value:await externalFn(),firewall:'passed'};}
    catch(error){externalFirewall.recordFailure(s.externalGate,String(error.message||error));return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,errorId:crypto.createHash('sha256').update(String(error.message||error)).digest('hex').slice(0,12)};}
  }
  function safeCall(id,externalFn,internalFallback,context={}){
    const s=get(id);
    if(!s?.enabled)return {ok:false,service:id,mode:'internal',layer:'internal',value:internalFallback};
    if(s.firewallRequired!==false){
      if(!s.externalGate)return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,error:'external_gate_not_mapped'};
      const fw=externalFirewall.authorizeTwoSided({gateId:s.externalGate,serviceId:id,externalEnabled:true,serviceSwitchActive:!!s.enabled,actor:context.actor||'master_admin',input:context.input||'',memoryTarget:context.memoryTarget||null,idempotencyKey:context.idempotencyKey||`service:${id}:${Date.now()}`,timeoutMs:context.timeoutMs||12000});
      if(!fw.ok)return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,firewall:fw};
    }
    try{return {ok:true,service:id,mode:'live',layer:'external',value:externalFn(),firewall:'passed'};}
    catch(error){return {ok:false,service:id,mode:'internal_fallback',layer:'internal',value:internalFallback,errorId:crypto.createHash('sha256').update(String(error.message||error)).digest('hex').slice(0,12)};}
  }
  return {config,status,get,toggle,toggleAsync,healthCheck,prerequisites,providerSlotStatus,safeCallProviderAsync,twoSwitchMatrix,matrixEntry,safeCallWithFallbackAsync,capability,safeCall,safeCallAsync,statePath,matrixPath};
}
module.exports={createServiceManager};
