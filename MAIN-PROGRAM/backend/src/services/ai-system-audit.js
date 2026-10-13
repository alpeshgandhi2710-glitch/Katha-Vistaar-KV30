'use strict';
const fs=require('node:fs');const path=require('node:path');
const aiManagement=require('./ai-management.js');const internal=require('./ai-internal-inference.js');const languages=require('./ai-language-support.js');const modelRuntime=require('./ai-internal-model-runtime.js');
const constitutionPath=path.resolve(__dirname,'../../../website-first/config/ai-constitutions-v30.json');
const benchmarkPath=path.resolve(__dirname,'../../../website-first/config/ai-multilingual-benchmark-v30.json');
function audit(){
 const errors=[];let constitutions;
 try{constitutions=JSON.parse(fs.readFileSync(constitutionPath,'utf8'));}catch(e){return {ok:false,errors:[`constitution_unreadable:${e.message}`]};}
 let benchmark;try{benchmark=JSON.parse(fs.readFileSync(benchmarkPath,'utf8'));}catch(e){errors.push(`multilingual_benchmark_unreadable:${e.message}`);benchmark={};}
 const ids=Object.keys(aiManagement.roles);const handlers=internal.status().handlerAIs;
 if(ids.length!==handlers.length)errors.push(`handler_count_mismatch:${ids.length}:${handlers.length}`);
 for(const id of ids){const r=aiManagement.roles[id];if(!r.active||!r.managed)errors.push(`unmanaged_or_inactive:${id}`);if(!handlers.includes(id))errors.push(`missing_internal_handler:${id}`);if(!constitutions.roles?.[id])errors.push(`missing_constitution:${id}`);if(r.externalAllowed!==false)errors.push(`external_default_not_disabled:${id}`);if(constitutions.roles?.[id]?.languageSupport!=='all_23_required')errors.push(`language_contract_missing:${id}`);}
 for(const id of handlers)if(!aiManagement.roles[id])errors.push(`orphan_handler:${id}`);
 const rt=modelRuntime.status();if(!rt.noCloudDependency)errors.push('internal_runtime_cloud_dependency');if(!Array.isArray(rt.metrics?Object.keys(rt.metrics):[]))errors.push('internal_runtime_metrics_missing');if(Number(benchmark.caseCount||0)<460)errors.push('multilingual_benchmark_too_small');if(Number(benchmark.languageCount||0)!==languages.all().length)errors.push('multilingual_benchmark_language_mismatch');
 return {ok:errors.length===0,errors,aiCount:ids.length,handlerCount:handlers.length,constitutionCount:Object.keys(constitutions.roles||{}).length,languageCount:languages.all().length,languageContract:languages.contract(),internalModel:internal.status(),localModelRuntime:rt,multilingualBenchmark:{caseCount:Number(benchmark.caseCount||0),languageCount:Number(benchmark.languageCount||0)}};
}
module.exports={audit};
