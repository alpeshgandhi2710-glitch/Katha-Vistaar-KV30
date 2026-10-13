'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const memory=require('../src/services/ai-memory-rag.js');

test('project and user memory are strictly owner-scoped and cannot cross-read',()=>{
  const suffix=Date.now();
  const projectId=`project-${suffix}`;
  const userA=`user-a-${suffix}`;
  const userB=`user-b-${suffix}`;
  const projectKey=`project-secret-${suffix}`;
  const userKey=`user-secret-${suffix}`;
  memory.put('project',{key:projectKey,value:'project-private',ownerId:projectId,approved:false});
  memory.put('user',{key:userKey,value:'user-a-private',ownerId:userA,approved:false});
  assert.equal(memory.search('project','project-private',5,projectId).length,1);
  assert.equal(memory.search('project','project-private',5,userB).length,0);
  assert.equal(memory.search('user','user-a-private',5,userA).length,1);
  assert.equal(memory.search('user','user-a-private',5,userB).length,0);
  assert.equal(memory.get('project',projectKey,userB),null);
  assert.equal(memory.get('user',userKey,userB),null);
  assert.throws(()=>memory.put('project',{key:projectKey,value:'cross-write',ownerId:userB}),e=>e.code==='memory_owner_mismatch');
  assert.throws(()=>memory.search('project','project-private',5),e=>e.code==='project_owner_required');
  memory.remove('project',projectKey,projectId);
  memory.remove('user',userKey,userA);
});

test('each memory scope is sealed and seal survives normal writes and reset',()=>{
  const uid=`seal-user-${Date.now()}`;
  const pid=`seal-project-${Date.now()}`;
  memory.put('project',{key:`seal-project-${pid}`,value:'keep project boundary',ownerId:pid});
  memory.put('user',{key:`seal-user-${uid}`,value:'keep user boundary',ownerId:uid});
  const before=memory.status();
  assert.equal(before.sealed,true);
  assert.equal(before.sealVerified,true);
  const snapshot=memory.snapshot();
  assert.equal(snapshot.memorySealVersion,'KV30-MEMORY-SEAL-1');
  assert.equal(Object.keys(snapshot.seals).length,4);
  const reset=memory.resetLeakedOperationalMemory({scope:'project',actor:'master_admin'});
  assert.equal(reset.ok,true);
  assert.equal(reset.knowledgePreserved,true);
  assert.equal(reset.masteryAndGovernancePreserved,true);
  assert.equal(memory.get('project',`seal-project-${pid}`,pid),null);
  const after=memory.status();
  assert.equal(after.sealed,true);
  assert.equal(after.sealVerified,true);
  memory.remove('user',`seal-user-${uid}`,uid);
});

test('sealed restore is Master-Admin-only and rejects tampered memory snapshots',()=>{
  const snap=memory.snapshot();
  assert.throws(()=>memory.restore(snap),e=>e.code==='master_admin_required');
  const tampered=JSON.parse(JSON.stringify(snap));
  tampered.data.user.push(['tampered',{id:'tampered',scope:'user',key:'tampered',value:'x',ownerId:'attacker',tags:[],approved:false,version:1,updatedAt:new Date().toISOString()}]);
  assert.throws(()=>memory.restore(tampered,{actor:'master_admin'}),e=>e.code==='memory_snapshot_seal_verification_failed');
});
