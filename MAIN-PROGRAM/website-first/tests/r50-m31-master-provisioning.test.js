const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const ROOT=path.join(__dirname,'..');
function req(port,path,method,body){return fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(async r=>({status:r.status,json:await r.json()}));}
test('master provisioning remains explicitly recovery-key and product-key gated',async()=>{
 const old={};for(const k of ['KV_ADMIN_KEY','KV_ADMIN_ROLE','KV_MASTER_ADMIN_KEY','KV_MASTER_RECOVERY_KEY','KV_PRODUCT_KEY','ALLOW_LOCAL_DEMO']){old[k]=process.env[k];delete process.env[k];}
 const setupFile=path.join(ROOT,'data','master-admin-setup.json');const backup=fs.existsSync(setupFile)?fs.readFileSync(setupFile):null;
 try{
  process.env.ALLOW_LOCAL_DEMO='false';process.env.KV_ADMIN_ROLE='master_admin';process.env.KV_MASTER_ADMIN_KEY='M31-MASTER-KEY';process.env.KV_MASTER_RECOVERY_KEY='M31-RECOVERY-KEY';process.env.KV_PRODUCT_KEY='M31-PRODUCT-KEY';
  fs.rmSync(setupFile,{force:true});
  delete require.cache[require.resolve('../src/server')];const mod=require('../src/server');const srv=http.createServer(mod.server);await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  try{const p=srv.address().port;let r=await req(p,'/api/admin/master/status','GET');assert.equal(r.status,200);assert.equal(r.json.initialized,false);r=await req(p,'/api/admin/master/setup','POST',{masterKey:'M31-MASTER-KEY',productKey:'M31-PRODUCT-KEY',recoveryKey:'wrong'});assert.equal(r.status,403);r=await req(p,'/api/admin/master/setup','POST',{masterKey:'M31-MASTER-KEY',productKey:'M31-PRODUCT-KEY',recoveryKey:'M31-RECOVERY-KEY'});assert.equal(r.status,200);r=await req(p,'/api/admin/master/setup','POST',{masterKey:'M31-MASTER-KEY',productKey:'M31-PRODUCT-KEY',recoveryKey:'M31-RECOVERY-KEY'});assert.equal(r.status,409);r=await req(p,'/api/admin/session','POST',{role:'master_admin',masterKey:'M31-MASTER-KEY',productKey:'wrong'});assert.equal(r.status,403);r=await req(p,'/api/admin/session','POST',{role:'master_admin',masterKey:'M31-MASTER-KEY',productKey:'M31-PRODUCT-KEY'});assert.equal(r.status,200);}
  finally{srv.close();}
 }finally{if(backup)fs.writeFileSync(setupFile,backup);else fs.rmSync(setupFile,{force:true});for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}delete require.cache[require.resolve('../src/server')];}
});
