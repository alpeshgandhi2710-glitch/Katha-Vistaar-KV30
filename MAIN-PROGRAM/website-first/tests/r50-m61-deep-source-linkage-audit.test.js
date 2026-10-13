const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const PROJECT=path.resolve(ROOT,'..');
const EXCLUDED=new Set(['node_modules','FINAL-AUDIT-EVIDENCE']);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(EXCLUDED.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else out.push(p);}return out;}
function localImportTargets(file){
 const src=fs.readFileSync(file,'utf8');
 const specs=[];
 const re=/(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:from|require\s*\()\s*['"]([^'"]+)['"]/g;
 let m;while((m=re.exec(src)))specs.push(m[1]||m[2]);
 return specs.filter(x=>x.startsWith('.'));
}
function resolveLocal(file,spec){const base=path.resolve(path.dirname(file),spec);return [base,base+'.js',base+'.cjs',base+'.mjs',path.join(base,'index.js')].find(fs.existsSync)||null;}
test('R50-M61 deep source linkage: syntax, local imports, stale temporary programs and generated artifacts',()=>{
 const files=walk(PROJECT);
 const code=files.filter(f=>/\.(js|cjs|mjs)$/.test(f)&&!/[/\\](tests?|test)[/\\]/.test(f));
 const syntax=[];
 for(const f of code){try{cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){syntax.push(f);}}
 assert.deepEqual(syntax,[],'production JS syntax failures');
 const missing=[];
 for(const f of code)for(const spec of localImportTargets(f))if(!resolveLocal(f,spec))missing.push(`${f} -> ${spec}`);
 assert.deepEqual(missing,[],'broken local imports');
 for(const stale of ['scripts/tmp-extract.js','scripts/audit-translations-r24.js'])assert.equal(fs.existsSync(path.join(ROOT,stale)),false,`obsolete script retained: ${stale}`);
});

test('R50-M61 deep source linkage: canonical parity contract remains wired',()=>{
 const server=fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8');
 const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
 assert.match(server,/KV30-SINGLE-ACCOUNT-SOURCE-OF-TRUTH-v1/);
 assert.match(server,/X-KV30-State-Hash/);
 assert.match(server,/kv30CanonicalStateHash/);
 assert.match(server,/kv30MutationConflict/);
 assert.match(app,/X-KV30-State-Hash/);
 assert.match(app,/canonicalStateHash|X-KV30-State-Hash/);
});
