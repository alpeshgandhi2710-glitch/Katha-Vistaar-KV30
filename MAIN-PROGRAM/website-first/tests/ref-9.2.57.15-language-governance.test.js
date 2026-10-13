const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=path.join(__dirname,'..');
const server=require(path.join(app,'src','server.js'));
const lifecycle=require(path.join(app,'..','backend','src','services','language-registry.js'));
const REQUIRED=['en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur'];

test('REF-9.2.57.15 — canonical 23-language contract is exact',()=>{
 assert.equal(server.languages.languages.length,22);
 const rows=lifecycle.all();
 assert.equal(rows.length,23);
 assert.deepEqual(rows.map(x=>x.code),REQUIRED);
});

test('REF-9.2.57.15 — future language lifecycle is fail-closed until five evidence gates pass',()=>{
 const code='zz';
 try{lifecycle.propose({code,name:'Test Language',nativeName:'Test Language',iso639_3:'zzz'},'master_admin');}catch(e){if(e.code==='language_already_exists')throw e;throw e;}
 let row=lifecycle.get(code);assert.equal(row.status,'proposed');assert.equal(row.enabled,false);
 assert.throws(()=>lifecycle.approve(code,'master_admin'),e=>e.code==='language_evidence_incomplete');
 lifecycle.recordEvidence(code,{uiCoverage:true,aiCoverage:true,ttsCoverage:true,testCoverage:true,governanceReview:true},'master_admin');
 row=lifecycle.approve(code,'master_admin');assert.equal(row.status,'approved');
 row=lifecycle.enable(code,'master_admin');assert.equal(row.status,'enabled');assert.equal(row.enabled,true);
 // cleanup the process-local overlay store so this test never becomes a product language.
 const store=server.languageRegistryStore;store.delete(code);
});

test('REF-9.2.57.15 — TTS contract declares all 23 languages without inventing model coverage',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(app,'config','ai-tts-runtime-v30.json'),'utf8'));
 assert.deepEqual(cfg.languageCoverageContract.languages,REQUIRED);
 assert.equal(cfg.languageCoverageContract.coverageMustBeVerifiedBeforeEnable,true);
});
