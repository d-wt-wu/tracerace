import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { freshProgress, recordPractice } from '../src/state/progress';
import { makeQuestion } from '../src/content/bank';
const base = process.env.EXPO_PUBLIC_API_URL;
if (
  !base?.startsWith('https://') ||
  !process.env.NEON_BRANCH_ID ||
  !base.includes(process.env.NEON_BRANCH_ID + '-') ||
  process.env.NEON_BRANCH === 'main'
)
  throw new Error('Account smoke testing requires the matching HTTPS development deployment.');
const email = 'smoke-' + randomBytes(12).toString('hex') + '@example.invalid';
const password = randomBytes(24).toString('base64url');
let cookie = '',
  created = false;
async function call(path: string, body?: unknown, method = 'POST', credential = cookie) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: 'http://localhost:8081',
      ...(credential ? { Cookie: credential } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const next = response.headers.getSetCookie();
  if (next.length) cookie = next.map((v) => v.split(';')[0]).join('; ');
  return response;
}
async function main() {
  const caps = await (await call('/api/auth-config', undefined, 'GET')).json();
  assert.equal(caps.email, true);
  if (caps.verification)
    throw new Error('Use a dedicated verified-mailbox test when email verification is enabled.');
  try {
    const signed = await call('/api/auth/sign-up/email', {
      name: 'HTTPS Smoke Test',
      email,
      password,
    });
    assert.equal(signed.status, 200, 'HTTPS email signup');
    created = true;
    assert.ok(cookie.includes('session_token'));
    assert.match(signed.headers.get('set-cookie') || '', /HttpOnly/i);
    assert.match(signed.headers.get('set-cookie') || '', /Secure/i);
    const user = (await signed.json()).user;
    assert.equal(
      (await (await call('/api/auth/get-session', undefined, 'GET')).json()).user.id,
      user.id,
    );
    assert.equal(
      (await call('/api/account/profile', { alias: 'HttpsSmokeTest', active: false })).status,
      201,
    );
    const progress = recordPractice(freshProgress(), makeQuestion('warm-up', 123), false).progress;
    assert.equal(
      (await call('/api/account/progress', { progress, revision: 0 }, 'PUT')).status,
      200,
    );
    assert.equal(
      (await (await call('/api/account/progress', undefined, 'GET')).json()).progress.skills[
        'warm-up'
      ].xp,
      20,
    );
    const oldCookie = cookie;
    assert.equal((await call('/api/auth/sign-out', {})).status, 200);
    assert.equal((await call('/api/account/progress', undefined, 'GET', oldCookie)).status, 401);
    assert.equal((await call('/api/auth/sign-in/email', { email, password })).status, 200);
    assert.equal(
      (await (await call('/api/account/profile', undefined, 'GET')).json()).profile.alias,
      'HttpsSmokeTest',
    );
    console.log(
      'HTTPS accounts verified: signup, secure cookie, session restoration, private profile, cloud save, revoked sign-out, and returning sign-in.',
    );
  } finally {
    if (created) {
      const login = await call('/api/auth/sign-in/email', { email, password });
      assert.equal(login.status, 200, 'Temporary account cleanup sign-in');
      const deleted = await call('/api/auth/delete-user', { password });
      assert.equal(deleted.status, 200, 'Temporary account cleanup');
      console.log('Deleted only the temporary HTTPS smoke account and its dependent records.');
    }
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Account smoke failed.');
  process.exitCode = 1;
});
