import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueTicket, verifyTicket } from '../server/tickets';
const key = 'test-signing-key-with-more-than-thirty-two-characters',
  now = Date.parse('2026-11-06T12:00:00Z');
test('a signed question ticket is bound to the player, family, and seed', () => {
  const token = issueTicket(key, 'alice', 'warm-up', 42, now);
  assert.equal(verifyTicket(key, token, 'alice', now).seed, 42);
  assert.throws(() => verifyTicket(key, token, 'bob', now));
});
test('ticket payload tampering, bad signatures, and stale tickets are rejected', () => {
  const token = issueTicket(key, 'alice', 'warm-up', 42, now);
  const [payload, signature] = token.split('.');
  const changed = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), seed: 999 }),
  ).toString('base64url');
  assert.throws(() => verifyTicket(key, changed + '.' + signature, 'alice', now));
  assert.throws(() => verifyTicket('another-signing-key', token, 'alice', now));
  assert.throws(() => verifyTicket(key, token, 'alice', now + 2 * 60 * 60 * 1000));
});
test('malformed tickets fail with bounded parsing', () => {
  for (const token of [null, '', 'a.b.c', 'a.b', 'x'.repeat(1001)])
    assert.throws(() => verifyTicket(key, token, 'alice', now));
});
