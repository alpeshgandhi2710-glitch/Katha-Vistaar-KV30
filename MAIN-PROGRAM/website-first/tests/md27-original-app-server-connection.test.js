const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const appPath=path.join(root,'public','app.js');
const serverPath=path.join(root,'src','server.js');
const app=fs.readFileSync(appPath,'utf8');
const server=fs.readFileSync(serverPath,'utf8');
const appApi=new Set([...app.matchAll(/['"](\/api\/[^'"?]+)/g)].map(m=>m[1]));
const serverApi=new Set([...server.matchAll(/['"](\/api\/[^'"?]+)/g)].map(m=>m[1]));
const unmatched=[...appApi].filter(p=>![...serverApi].some(s=>p===s||p.startsWith(s.replace(/\/$/,''))||s.startsWith(p.replace(/\/$/,''))));
assert.equal(unmatched.length,0,`Unmatched app API paths: ${unmatched.join(', ')}`);
assert.match(server,/safeFile\(u\.pathname==='\/'\?'index\.html'/,'server must serve public app');
assert.match(server,/path\.join\(ROOT,'public','index\.html'\)/,'server must serve SPA index');

const port=8791;
const child=spawn(process.execPath,['src/server.js'],{cwd:root,env:{...process.env,PORT:String(port),KV_ENV:'production',KV_PASSWORD_SALT:'md27-test-only-salt-2026',ALLOW_LOCAL_DEMO:'false'},stdio:['ignore','pipe','pipe']});
let logs=''; child.stdout.on('data',d=>logs+=d); child.stderr.on('data',d=>logs+=d);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(pathname){const r=await fetch(`http://127.0.0.1:${port}${pathname}`);return {status:r.status,text:await r.text(),headers:r.headers};}
(async()=>{
 try{
  let ready=false; for(let i=0;i<40;i++){try{const r=await get('/api/readiness'); if(r.status===200){ready=true; break;}}catch{} await wait(100);}
  assert.equal(ready,true,'server did not become ready');
  const home=await get('/'); assert.equal(home.status,200,'server must serve app root'); assert.match(home.text,/Katha Vistaar/i,'root must be KV30 app HTML');
  const readiness=await get('/api/readiness'); assert.equal(readiness.status,200); const rd=JSON.parse(readiness.text); assert.equal(rd.ready,true);
  const langs=await get('/api/ai/languages'); assert.equal(langs.status,200); const ld=JSON.parse(langs.text); const aiLanguageCount=Array.isArray(ld.languages)?ld.languages.length:(Array.isArray(ld.contract?.languages)?ld.contract.languages.length:(Array.isArray(ld.supported)?ld.supported.length:Number(ld.count||0))); assert.equal(aiLanguageCount,23);
  const bootstrap=await get('/api/bootstrap'); assert.equal(bootstrap.status,200); assert.match(bootstrap.text,/Katha|services|production|local-demo/i);
  console.log(JSON.stringify({ok:true,appApiPathCount:appApi.size,serverApiPathCount:serverApi.size,unmatched:0,rootStatus:home.status,readinessStatus:readiness.status,readinessReady:rd.ready,aiLanguageCount,bootstrapStatus:bootstrap.status},null,2));
 }catch(e){console.error(e.stack); process.exitCode=1;} finally{child.kill('SIGTERM'); await wait(150);}
})();
