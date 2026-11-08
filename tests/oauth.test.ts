import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleRedirectURL } from '../src/domain/oauth';
test('web OAuth accepts only a Google authorization-code URL returning to the configured API', () => {
  const base = 'https://tracerace.onrender.com';
  const valid = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  valid.searchParams.set('response_type', 'code');
  valid.searchParams.set('redirect_uri', base + '/api/auth/callback/google');
  assert.equal(googleRedirectURL(valid.href, base), valid.href);
  for (const change of [
    (u: URL) => {
      u.hostname = 'accounts.google.com.attacker.invalid';
    },
    (u: URL) => {
      u.protocol = 'http:';
    },
    (u: URL) => {
      u.username = 'unexpected';
    },
    (u: URL) => {
      u.pathname = '/unrelated';
    },
    (u: URL) => {
      u.searchParams.set('response_type', 'token');
    },
    (u: URL) => {
      u.searchParams.set('redirect_uri', 'https://attacker.invalid/callback');
    },
  ]) {
    const bad = new URL(valid);
    change(bad);
    assert.throws(() => googleRedirectURL(bad.href, base));
  }
});
