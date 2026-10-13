const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'config', name), 'utf8'));
const registry = read('service-registry-v30.json');
const slots = read('external-provider-slots-v30.json');
const matrix = read('external-service-two-switch-matrix-v30.json');
const profile = read('external-gate-configuration-profile-v30.json');
const audit = read('external-service-architecture-audit-v30.json');

test('M69 reconciles service registry, provider slot inventory, matrix, and gate profile', () => {
  const registryServices = Object.keys(registry.services).sort();
  assert.deepEqual([...slots.services].sort(), registryServices,
    'every registry service must appear in the provider-slot service inventory');
  assert.equal(new Set(slots.services).size, slots.services.length, 'provider service inventory must be unique');
  assert.equal(slots.slots.length, slots.services.length * slots.slotsPerService);
  for (const service of slots.services) {
    const serviceSlots = slots.slots.filter(slot => slot.service === service);
    assert.equal(serviceSlots.length, slots.slotsPerService, `${service} must have exactly ${slots.slotsPerService} slots`);
    assert.deepEqual(serviceSlots.map(slot => slot.slot).sort(), [1, 2, 3], `${service} slots must be numbered 1..3`);
    for (const slot of serviceSlots) {
      assert.ok(profile.providerAlternate.some(gate => gate.gate === slot.gate && gate.service === service && gate.providerSlotId === slot.id),
        `provider alternate gate must match ${slot.id}`);
    }
  }
  const matrixServices = [...matrix.services, ...matrix.reservedServiceBindings];
  assert.deepEqual([...new Set(matrixServices.map(item => item.serviceId))].sort(), registryServices,
    'historical core and reserved bindings together must cover each registry service exactly once');
  for (const item of matrixServices) {
    const service = registry.services[item.serviceId];
    assert.ok(service, `matrix service ${item.serviceId} must exist in registry`);
    const primaryGate = item.serviceSwitch || item.primary?.gate || service.externalGate;
    const primaryGateExists = profile.nonAi.some(gate => gate.gate === primaryGate && gate.service === item.serviceId) ||
      profile.aiSpecialist.some(gate => gate.gate === primaryGate);
    assert.ok(primaryGateExists, `primary gate must match ${item.serviceId} (${primaryGate})`);
    if (Object.hasOwn(item, 'externalDefaultEnabled')) {
      assert.equal(item.externalDefaultEnabled, false, `${item.serviceId} external service must remain disabled by default`);
    }
  }
  assert.equal(profile.nonAi.length, audit.nonAiServiceGateCount);
  assert.equal(profile.aiSpecialist.length, audit.aiSpecialistGateCount);
  assert.equal(profile.projectMemory.length, audit.projectMemoryGateCount);
  assert.equal(profile.providerAlternate.length, audit.providerAlternateGateCount);
  assert.equal(slots.services.length, audit.providerServiceClassCount);
  assert.equal(profile.nonAi.length + profile.aiSpecialist.length, audit.canonicalPrimaryGateCount);
  assert.equal(profile.nonAi.length + profile.aiSpecialist.length + profile.projectMemory.length, audit.totalGovernedGateRecords);
});

test('M69 keeps external providers fail-closed while internal service layer remains available', () => {
  for (const [serviceId, service] of Object.entries(registry.services)) {
    assert.equal(service.externalEnabled, false, `${serviceId} externalEnabled default`);
    assert.equal(service.defaultEnabled, false, `${serviceId} defaultEnabled`);
    assert.equal(service.internalLayer, 'always_on', `${serviceId} internal layer`);
    assert.equal(service.externalLayer, 'master_admin_controlled', `${serviceId} external control`);
  }
  for (const slot of slots.slots) {
    assert.equal(slot.enabled, false, `${slot.id} must remain disabled`);
    assert.equal(slot.defaultEnabled, false, `${slot.id} default must remain disabled`);
  }
});
