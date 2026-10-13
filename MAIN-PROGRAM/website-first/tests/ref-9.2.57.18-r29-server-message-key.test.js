const fs=require('fs');const assert=require('assert');const path=require('path');
const server=fs.readFileSync(path.join(__dirname,'..','src','server.js'),'utf8');
// API response user-facing message bodies must be governed by messageKey.
const lines=server.split(/\n/);
const staticMessage=[];
for(const [i,line] of lines.entries()){
  if(/\bmessage\s*:\s*['"]/.test(line)) staticMessage.push([i+1,line.trim()]);
}
assert.strictEqual(staticMessage.length,0,`static server message fields remain: ${staticMessage.map(x=>x[0]).join(',')}`);
const keys=[...server.matchAll(/messageKey\s*:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
assert(keys.length>=40,`expected governed server message keys, found ${keys.length}`);
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
for(const k of new Set(keys)) assert(app.includes(`"${k}":`)||app.includes(`'${k}':`),`English catalog missing ${k}`);
console.log(`PASS R29 server message-key governance: ${new Set(keys).size} governed keys; zero static server message fields`);
