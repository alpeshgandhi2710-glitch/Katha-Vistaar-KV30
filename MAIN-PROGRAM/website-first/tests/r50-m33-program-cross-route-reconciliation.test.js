const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'public','app.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'..','mobile','lib','mobile_tools.dart'),'utf8');
function hasServerPath(pathname){const escaped=pathname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return server.includes(`u.pathname==='${pathname}'`)||server.includes(`u.pathname==="${pathname}"`)||server.includes(`u.pathname.startsWith('${pathname}')`)||server.includes(`u.pathname.startsWith("${pathname}")`)||new RegExp(`u\\.pathname\\.(?:startsWith|includes)\\([^)]*${escaped}`).test(server);}
test('website media stream caller has a live server handler',()=>{assert.match(app,/['"]\/api\/media\/assets\/stream['"]/);assert.equal(hasServerPath('/api/media/assets/stream'),true);});
test('mobile audio project publish caller is covered by the parameterized server route',()=>{assert.match(mobile,/\/api\/studio\/publish-project\/audio\//);assert.match(server,/u\.pathname\.startsWith\('\/api\/studio\/publish-project\/'\)/);});
test('frontend media upload paths remain within the governed server media route family',()=>{const paths=[...new Set([...app.matchAll(/['"](\/api\/media\/assets(?:\/stream)?)/g)].map(m=>m[1]))];for(const p of paths)assert.equal(hasServerPath(p),true,`missing server handler for ${p}`);});
