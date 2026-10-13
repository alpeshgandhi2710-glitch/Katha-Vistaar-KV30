const fs=require('fs');
const base=process.env.KV30_RUNTIME_BASE_URL||'http://127.0.0.1:8787';
const cookie=process.env.KV30_RUNTIME_COOKIE||'';
if(!cookie){console.error('KV30_RUNTIME_COOKIE is required; pass the authenticated kv_session value.');process.exit(2)}
const langs=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];
const types=['story','comic','audio','reel'];
async function call(path,body,lang){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':lang,'X-KV30-UI-Language':lang,'Cookie':`kv_session=${cookie}`},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return {status:r.status,j};}
(async()=>{let rows=[];for(const lang of langs){for(const type of types){for(const action of ['reader','writer']){let path,body;if(action==='reader'){path='/api/ai/reader-assist';body={action:'summary',text:'A short test story about a creator finding a new idea.',title:'Runtime Test',type,language:lang};}else{path='/api/ai/creator-generate';body={type,prompt:'Create a short test proposal about a creator finding a new idea.',title:'Runtime Test',language:lang};}const o=await call(path,body,lang);rows.push({lang,type,action,status:o.status,ok:o.j?.ok===true,language:o.j?.language||o.j?.generated?.language||null,mode:o.j?.mode||null,error:o.j?.error||null,external:o.j?.externalUsed});}}}
const out=process.env.KV30_RUNTIME_OUTPUT||'runtime-ai-23-language-matrix.json'; fs.writeFileSync(out,JSON.stringify(rows,null,2));
const fail=rows.filter(x=>!(x.status>=200&&x.status<300&&x.ok));const wrong=rows.filter(x=>x.language&&x.language!==x.lang);console.log(`rows=${rows.length} pass=${rows.length-fail.length} fail=${fail.length} languageMismatch=${wrong.length}`);if(fail.length)console.log(fail.slice(0,20));if(wrong.length)console.log(wrong.slice(0,20));
})();
