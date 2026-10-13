const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
test('internal-first AI experience is wired into real reader and creator actions',()=>{
 const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
 const server=fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8');
 assert.match(app,/data-reader-ai=\"summary\"/);
 assert.match(app,/runReaderAI\(b\.dataset\.readerAi,c\)/);
 assert.match(app,/characterArchitectAssist/);
 assert.match(app,/storyMapAssist/);
 assert.match(server,/\/api\/ai\/reader-assist/);
 assert.match(server,/\/api\/ai\/character-assist/);
 assert.match(app,/class=\"ai-icon-button\"/);
});
test('AI experience policy keeps external AI optional and Master Admin controlled',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'config','ai-experience-v30.json'),'utf8'));
 assert.equal(cfg.internalFirst,true);
 assert.equal(cfg.externalAI.allowed,true);
 assert.equal(cfg.externalAI.masterAdminControlled,true);
 assert.equal(cfg.externalAI.paidOrFree,true);
 assert.equal(cfg.media.externalGenerationFallback,true);
});
