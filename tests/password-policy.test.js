'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../backend/utils/password-policy');

test('password policy accepts strong passwords', () => {
  assert.equal(validatePassword('Tomato-River-42'), null);
  assert.equal(validatePassword('CustomerPass123!', { email: 'someone@example.com', name: 'Some One' }), null);
});

test('password policy rejects weak passwords', () => {
  const bad = ['short1', 'abcdefghijkl', '1234567890', 'Password123', 'password12345', 'qwerty123456',
    'aaaaaaaaaa1', 'x'.repeat(80) + '1'];
  for (const value of bad) assert.notEqual(validatePassword(value), null, `${value.slice(0, 12)} should be rejected`);
});

test('password policy rejects passwords containing the email name or the name', () => {
  assert.notEqual(validatePassword('thendo-2024-xyz', { email: 'thendo@example.com' }), null);
  assert.notEqual(validatePassword('Kamogelo9812', { name: 'Kamogelo' }), null);
});
