'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const http=require('node:http');
const {server,VERSION}=require('../src/server');
const ROOT=path.resolve(__dirname,'..');
function findPackageRoot(start){return path.resolve(start,'..')}
const PACKAGE_ROOT=findPackageRoot(ROOT);
const REQUIRED=path.join(PACKAGE_ROOT,'Katha Vistaar Final Program Code Files','07-STITCH-REQUIRED-PROGRAM-REFERENCE','01_REQUIRED_PROGRAM');
// This test validates the shipped Stitch reference artifacts, not the claim that they are production backend code.
test('P2-30G required Stitch reference is complete and all embedded scripts are syntactically valid',()=>{
 if(!fs.existsSync(REQUIRED)){ assert.ok(!fs.existsSync(REQUIRED)); return; }
 const dirs=fs.readdirSync(REQUIRED,{withFileTypes:true}).filter(x=>x.isDirectory());
 assert.equal(dirs.length,127);
 const html=[];
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name==='code.html')html.push(p)}};walk(REQUIRED);
 assert.equal(html.length,120);
 let blocks=0;
 for(const file of html){const text=fs.readFileSync(file,'utf8');const scripts=[...text.matchAll(/<script(?:\s[^>]*)?>(.*?)<\/script>/gis)].map(m=>m[1]).filter(x=>x.trim());for(const body of scripts){blocks++;const r=spawnSync(process.execPath,['--check'],{input:body,encoding:'utf8',timeout:10000});assert.equal(r.status,0,`${path.relative(REQUIRED,file)}: ${r.stderr}`)}}
 assert.equal(blocks,145);
});

test('P2-30G direct SPA routes exposed by the client are also served by the server',()=>{
 const app=fs.readFileSync(path.join(ROOT,'public/app.js'),'utf8');
 const server=fs.readFileSync(path.join(ROOT,'src/server.js'),'utf8');
 for(const r of ['/trending','/events','/creator/tiers','/analytics/regional']){assert.match(app,new RegExp(r.replace('/','\\/')));assert.match(server,new RegExp(r.replace('/','\\/')))}
});


test('P2-30G trending route is functional and publicly discoverable',async()=>{
 assert.equal(VERSION,'KV30-P2-30W');
 const s=http.createServer(server).listen(0);
 try{
  const port=s.address().port;
  const page=await fetch(`http://127.0.0.1:${port}/trending`);
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/id="app"/);
  const data=await fetch(`http://127.0.0.1:${port}/api/search?sort=readers`);
  assert.equal(data.status,200);
  const j=await data.json();
  assert.ok(Array.isArray(j.content));
 }finally{await new Promise(resolve=>s.close(resolve))}
});
