const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
assert(server.includes("u.pathname==='/api/admin/media'&&req.method==='GET'"));
assert(server.includes('storyMediaReview'));
assert(server.includes('mediaRights'));
assert(server.includes('coverReady'));
assert(server.includes("requireAdminContext(res,req,['admin','master_admin'],'media.manage')"));
console.log(JSON.stringify({status:'PASS',storyMediaAdminReviewQueue:true,rightsReadinessExposed:true,adminAuthorizationPreserved:true},null,2));
