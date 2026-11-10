const { test } = require('node:test');
const assert = require('node:assert/strict');
const { offlineProfile, memory, validateLaunch } = require('../src/core');
test('offline UUID matches Minecraft OfflinePlayer algorithm', () => {
  assert.equal(offlineProfile('Notch').uuid, 'b50ad385829d3141a2167e7d7539ba7f');
  assert.equal(offlineProfile('Notch').access_token, '0');
  assert.notEqual(offlineProfile('Notch').uuid, offlineProfile('notch').uuid);
});
test('rejects invalid offline names', () => {
  for (const name of ['', 'ab', '../name', 'a b', '<script>', 'a'.repeat(17)]) assert.throws(() => offlineProfile(name));
});
test('memory validates launch resource bounds', () => {
  assert.deepEqual(memory(4), { min: '1G', max: '4G' });
  for (const value of [0, -1, 33, NaN, 2.5, '4G']) assert.throws(() => memory(value));
});
test('only official manifest versions and supported modes can launch', () => {
  const versions = [{ id: '1.21.1', type: 'release' }];
  assert.equal(validateLaunch({ version: '1.21.1', ram: 4, mode: 'offline' }, versions).version.id, '1.21.1');
  assert.throws(() => validateLaunch({ version: '../../evil', ram: 4, mode: 'offline' }, versions));
  assert.throws(() => validateLaunch({ version: '1.21.1', ram: 4, mode: 'unknown' }, versions));
});
