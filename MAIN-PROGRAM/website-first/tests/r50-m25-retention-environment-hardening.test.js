const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createPersistence}=require('../core/persistence');

test('M25 persistence defaults are isolated by runtime environment',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kv30-m25-env-'));
 const dev=createPersistence(root,{KV_PERSISTENCE:'true',KV_ENV:'development',NODE_ENV:'development'});
 const prod=createPersistence(root,{KV_PERSISTENCE:'true',KV_ENV:'production',NODE_ENV:'production'});
 assert.equal(dev.status().runtimeEnv,'development');
 assert.equal(prod.status().runtimeEnv,'production');
 assert.notEqual(dev.status().path,prod.status().path);
 assert.match(dev.status().path,/development[\\/].+\.sqlite$/);
 assert.match(prod.status().path,/production[\\/].+\.sqlite$/);
});

console.log('PASS M25 persistence environment isolation');
