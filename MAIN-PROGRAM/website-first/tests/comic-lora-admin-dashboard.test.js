'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
test('Master Admin Comic LoRA dashboard exposes governed two-layer, gates, adapter and asset boundary',()=>{
 const dash=JSON.parse(fs.readFileSync(path.join(ROOT,'config','admin-dashboard-v30.json'),'utf8'));
 const svc=JSON.parse(fs.readFileSync(path.join(ROOT,'config','comic-lora-external-service-v30.json'),'utf8'));
 const adapter=JSON.parse(fs.readFileSync(path.join(ROOT,'config','comic-lora-adapter-settings-v30.json'),'utf8'));
 assert.ok(dash.masterAdminDashboards.includes('comic-lora-external-service'));
 assert.equal(svc.serviceId,'comic_lora'); assert.equal(svc.masterAdminOnly,true); assert.equal(svc.externalDefaultEnabled,false);
 assert.equal(svc.internalFallback,'internal_character_comic_continuity');
 assert.equal(svc.primaryGate,'service_gate_comic_lora'); assert.equal(svc.inboundGate,'gate_comic_lora_inbound'); assert.equal(svc.rightsGate,'gate_comic_lora_rights'); assert.equal(svc.outboundGate,'gate_comic_lora_outbound');
 assert.equal(adapter.twoLayer.internal,'always_on'); assert.equal(adapter.twoLayer.external,'master_admin_controlled'); assert.equal(adapter.persistence.neverPersistCredentials,true);
 const server=fs.readFileSync(path.join(ROOT,'src','server.js'),'utf8'); assert.ok(server.includes("/api/admin/services/comic-lora"));
});
