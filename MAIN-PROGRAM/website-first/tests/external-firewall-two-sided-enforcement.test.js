'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const firewall=require('../../backend/src/services/external-gate-firewall.js');

test('generic external authorization enforces both inbound and outbound firewall phases',()=>{
  const r=firewall.authorizeTwoSided({
    gateId:'service_gate_email',serviceId:'email',externalEnabled:true,serviceSwitchActive:true,
    actor:'master_admin',input:'notification payload',idempotencyKey:'two-sided-test-1'
  });
  assert.equal(r.ok,true);
  assert.equal(r.phase,'both');
  assert.equal(r.inbound.firewallDirection,'inbound');
  assert.equal(r.outbound.firewallDirection,'outbound');
  assert.equal(r.firewall,'two_sided_passed');
});

test('two-sided authorization fails closed before outbound phase when inbound input is unsafe',()=>{
  const r=firewall.authorizeTwoSided({
    gateId:'service_gate_email',serviceId:'email',externalEnabled:true,serviceSwitchActive:true,
    actor:'master_admin',input:'api_key: SECRET',idempotencyKey:'two-sided-test-2'
  });
  assert.equal(r.ok,false);
  assert.equal(r.phase,'inbound');
  assert.equal(r.inbound.reason,'credential-secret-redaction');
  assert.equal(r.outbound,undefined);
});

test('wrong gate/service binding is rejected in outbound phase as well',()=>{
  const r=firewall.authorizeTwoSided({
    gateId:'service_gate_email',serviceId:'sms',externalEnabled:true,serviceSwitchActive:true,
    actor:'master_admin',input:'safe',idempotencyKey:'two-sided-test-3'
  });
  assert.equal(r.ok,false);
  assert.equal(r.phase,'inbound');
  assert.equal(r.inbound.reason,'service_gate_authority_mismatch');
});
