const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const serverSrc=fs.readFileSync(path.join(root,'src','server.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');

const finalRoot=root;
test('P2-30B visual contract follows supplied mobile reference and has working bottom navigation',()=>{
 assert.match(css,/--kv-purple:#6d3cc2/);
 assert.match(css,/mobile-bottom-nav/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html,/class="brand-logo"/);
 for(const route of ['home','discover','library','write','account']) assert.match(html,new RegExp('data-route="'+route+'"'));
 assert.match(js,/function renderMobileNav\(\)/);
 assert.equal((js.match(/item\('notifications'/g)||[]).length,1);
 assert.equal((js.match(/item\('messages'/g)||[]).length,1);
});

test('P2-30B authentication UI keeps the approved login rule',()=>{
 assert.match(html,/Username, Email, or Mobile/);
 assert.match(html,/id="loginIdentifier"/);
 assert.match(html,/id="loginPassword"/);
 assert.match(js,/verification_required/);
 assert.match(js,/verify-login-otp/);
 assert.match(html,/id="registerConfirmPassword"/);
 assert.match(html,/id="resetConfirmPassword"/);
});

test('P2-30B governed backup/recovery contract is present in the active source',()=>{
 assert.match(serverSrc,/\/api\/admin\/backup\/snapshot/);
 assert.match(serverSrc,/\/api\/admin\/backup\/restore/);
 assert.match(serverSrc,/masterAdminOnly:true/);
 assert.match(serverSrc,/KV_BACKUP_ENCRYPTION_KEY/);
 assert.match(serverSrc,/AES-256-GCM/);
 assert.match(serverSrc,/authEnvelope/);
 assert.doesNotMatch(serverSrc,/BEGIN .*PRIVATE KEY/);
});

test('P2-30B backup snapshot is protected and version-bound',()=>{
 assert.match(serverSrc,/requireAdminContext\(res,req,\['master_admin'\]\)/);
 assert.match(serverSrc,/backup_version_mismatch/);
 assert.match(serverSrc,/backup_snapshot_created/);
 assert.match(serverSrc,/backup_restore_completed/);
});
