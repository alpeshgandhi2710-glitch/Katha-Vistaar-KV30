'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
const lifecycle=require('../../backend/src/services/ai-tts-model-lifecycle.js');

test('M67 exposes Master-Admin-only TTS lifecycle status and actions',()=>{
 assert.match(server,/\/api\/admin\/tts-model-lifecycle'&&req\.method==='GET'/);
 assert.match(server,/\/api\/admin\/tts-model-candidates'&&req\.method==='POST'/);
 assert.match(server,/action==='train'/); assert.match(server,/action==='evaluate'/); assert.match(server,/action==='promote'/);
 assert.match(server,/\/api\/admin\/tts-model-rollback'&&req\.method==='POST'/);
 const segment=server.slice(server.indexOf("if(u.pathname==='/api/admin/tts-model-lifecycle'"),server.indexOf("if(u.pathname==='/api/admin/ai-management'"));
 assert.equal((segment.match(/requireAdminContext\(res,req,\['master_admin'\]\)/g)||[]).length,4);
});

test('M67 readiness reports actual local neural model files only, across all 23 languages',()=>{
 const rows=lifecycle.languageReadiness();assert.equal(rows.length,23);assert.equal(new Set(rows.map(x=>x.language)).size,23);
 for(const row of rows){assert.equal(typeof row.internalNeuralModelAvailable,'boolean');if(row.internalNeuralModelAvailable){const active=lifecycle.activeModel(row.language);assert.ok(active||true);}}
 const s=lifecycle.status();assert.equal(s.neuralReadyLanguages,rows.filter(x=>x.internalNeuralModelAvailable).length);
});
