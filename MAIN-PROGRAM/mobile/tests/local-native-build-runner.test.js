const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('local native runner explicitly blocks missing toolchains and forbids uploads/signing', () => {
  const p = path.join(__dirname, '../scripts/run-local-native-build.sh');
  const s = fs.readFileSync(p, 'utf8');
  assert.match(s, /external_upload=DISABLED/);
  assert.match(s, /production_signing=DISABLED/);
  assert.match(s, /Flutter SDK unavailable/);
  assert.match(s, /iOS compilation requires macOS\/Xcode/);
  assert.match(s, /verify-native-build-output\.js/);
});
