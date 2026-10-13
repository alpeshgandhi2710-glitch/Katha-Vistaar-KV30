#!/usr/bin/env node
const path=require('node:path');
const {createServiceManager}=require('../services/service-manager.js');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const services=createServiceManager(root,process.env);
  const service='reel_media';
  const pre=services.prerequisites(service);
  if(!pre.ready){
    console.error(JSON.stringify({ok:false,gate:'PASS-EXTERNAL',service,stage:'prerequisites',reason:pre.reason},null,2));
    process.exit(2);
  }
  const result=await services.healthCheck(service);
  const ok=Boolean(result.available&&result.health&&result.health.passed);
  console.log(JSON.stringify({
    ok,
    gate:'PASS-EXTERNAL',
    service,
    providerConfigured:Boolean(result.provider&&result.endpoint),
    health:result.health,
    externalEnabled:result.enabled,
    note:ok?'Live external provider health check passed.':'Live external provider health check did not pass; no PASS is claimed.'
  },null,2));
  process.exit(ok?0:3);
})().catch(e=>{console.error(JSON.stringify({ok:false,gate:'PASS-EXTERNAL',error:String(e.message||e)},null,2));process.exit(4);});
