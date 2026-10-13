#!/usr/bin/env node
const http=require('node:http');
const base=String(process.env.KV_PRODUCTION_HEALTH_URL||'http://127.0.0.1:8787/api/readiness');
const u=new URL(base);
const req=http.request({hostname:u.hostname,port:u.port||80,path:u.pathname+u.search,method:'GET',timeout:5000},res=>{
  let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>{
    let data={};try{data=JSON.parse(body)}catch{}
    const ok=res.statusCode===200&&data.ready===true&&data.runtimeEnv==='production';
    console.log(JSON.stringify({ok,gate:'PRODUCTION-LIVE',httpStatus:res.statusCode,data},null,2));
    process.exit(ok?0:3);
  });
});
req.on('timeout',()=>req.destroy(new Error('readiness_timeout')));
req.on('error',e=>{console.error(JSON.stringify({ok:false,gate:'PRODUCTION-LIVE',error:String(e.message||e)},null,2));process.exit(4);});
req.end();
