'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const learning=require('../src/services/ai-user-content-learning.js');
const memory=require('../src/services/ai-memory-rag.js');
test('user content learning is consent and rights gated and owner scoped',()=>{
 const uid='learn-test-'+Date.now();
 assert.throws(()=>learning.indexContent({userId:uid,contentId:'c1',title:'Story'}),e=>e.code==='content_learning_consent_required');
 const r=learning.indexContent({userId:uid,contentId:'c1',type:'story',title:'મારી વાર્તા',body:'આ એક માલિકીની વાર્તા છે.',languageCode:'gu',consent:true,rightsConfirmed:true});
 assert.equal(r.ok,true);const rows=memory.search('user','મારી વાર્તા',5,uid);assert.equal(rows.length,1);assert.equal(rows[0].ownerId,uid);assert.throws(()=>learning.proposeTraining({userId:uid,aiId:'story_ai',contentId:'c1',exampleInput:'x',exampleOutput:'y',rightsConfirmed:false,evaluationPassed:true}),e=>e.code==='learning_rights_confirmation_required');memory.remove('user',`content:${uid}:c1`,uid);
});
