'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const runtimePath=require.resolve('../src/services/ai-internal-model-runtime');

function mockServer(){
 return http.createServer((req,res)=>{
  if(req.url==='/v1/models'){
   if(req.headers.authorization!=='Bearer test-provider-key'){res.statusCode=401;return res.end('{}');}
   res.setHeader('content-type','application/json');return res.end(JSON.stringify({data:[{id:'Qwen/Qwen3-32B'}]}));
  }
  if(req.url==='/v1/chat/completions'){
   if(req.headers.authorization!=='Bearer test-provider-key'){res.statusCode=401;return res.end('{}');}
   let body='';req.on('data',c=>body+=c);req.on('end',()=>{
    const p=JSON.parse(body);assert.equal(p.model,'Qwen/Qwen3-32B');
    res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:'REMOTE QWEN MOCK INFERENCE PASS'}}]}));
   });return;
  }
  res.statusCode=404;res.end();
 });
}

test('remote OpenAI-compatible Qwen3-32B adapter requires exact model and supports authenticated generation',async()=>{
 const old={provider:process.env.KV_INTERNAL_MODEL_PROVIDER,url:process.env.KV_INTERNAL_REMOTE_OPENAI_URL,model:process.env.KV_INTERNAL_REMOTE_MODEL,key:process.env.KV_INTERNAL_REMOTE_API_KEY};
 const s=mockServer();await new Promise(r=>s.listen(0,r));
 try{
  const port=s.address().port;
  process.env.KV_INTERNAL_MODEL_PROVIDER='remote-openai-compatible';
  process.env.KV_INTERNAL_REMOTE_OPENAI_URL=`http://127.0.0.1:${port}`;
  process.env.KV_INTERNAL_REMOTE_MODEL='Qwen/Qwen3-32B';
  process.env.KV_INTERNAL_REMOTE_API_KEY='test-provider-key';
  delete require.cache[runtimePath];const runtime=require(runtimePath);
  const h=await runtime.health();assert.equal(h.ok,true);assert.equal(h.provider,'remote-openai-compatible');assert.equal(h.model,'Qwen/Qwen3-32B');assert.equal(h.modelLoaded,true);
  const g=await runtime.generate({aiId:'Writer AI',task:'test',input:'hello',language:'gu'});assert.equal(g.ok,true);assert.equal(g.provider,'remote-openai-compatible');assert.equal(g.model,'Qwen/Qwen3-32B');assert.equal(g.latencySource,'remote_internal_runtime');assert.equal(g.text,'REMOTE QWEN MOCK INFERENCE PASS');
 }finally{await new Promise(r=>s.close(r));for(const [k,v] of Object.entries({KV_INTERNAL_MODEL_PROVIDER:old.provider,KV_INTERNAL_REMOTE_OPENAI_URL:old.url,KV_INTERNAL_REMOTE_MODEL:old.model,KV_INTERNAL_REMOTE_API_KEY:old.key})){if(v===undefined)delete process.env[k];else process.env[k]=v;}delete require.cache[runtimePath];}
});
