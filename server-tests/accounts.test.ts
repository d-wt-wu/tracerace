import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { createAuth } from '../server/auth';
import { createApi } from '../server/api';
import { databaseURL } from '../server/database-url';
import { freshProgress, recordPractice } from '../src/state/progress';
import { BANK_VERSION, makeQuestion } from '../src/content/bank';
import { beginCourseSession, updateConcept } from '../src/domain/course';
if (!process.env.DATABASE_URL || process.env.NEON_BRANCH === 'main')
  throw new Error('Account tests require a migrated development database.');
const pool = new Pool({ connectionString: databaseURL(process.env.DATABASE_URL), max: 5 });
const prefix = 'account-test-' + randomBytes(7).toString('hex');
const password = 'test-only-' + randomBytes(16).toString('hex');
const origin = 'http://localhost:8081';
const auth = createAuth(pool, randomBytes(48).toString('hex'), 'http://localhost:8787', {
  rateLimit: false,
});
const app = createApi(pool, randomBytes(48).toString('hex'), { auth, quotaPrefix: prefix });
const users: string[] = [];
const guests: string[] = [];
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
}
async function call(
  path: string,
  cookie = '',
  body?: unknown,
  method = 'POST',
  reqOrigin = origin,
) {
  return app.request(path, {
    method,
    headers: {
      Origin: reqOrigin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function signup(suffix: string) {
  const email = prefix + '-' + suffix + '@example.invalid';
  const response = await call('/api/auth/sign-up/email', '', {
    name: 'Account Test',
    email,
    password,
  });
  assert.equal(response.status, 200, await response.clone().text());
  const data = await response.json();
  users.push(data.user.id);
  return { id: data.user.id as string, email, cookie: cookies(response) };
}
let a: Awaited<ReturnType<typeof signup>>, b: Awaited<ReturnType<typeof signup>>;
before(async () => {
  a = await signup('a');
  b = await signup('b');
});
after(async () => {
  for (const id of users) await pool.query('delete from auth_users where id=$1', [id]);
  for (const id of guests) await pool.query('delete from players where id=$1', [id]);
  await pool.query('delete from api_quotas where key like $1', [prefix + ':%']);
  await pool.end();
});
test('real email signup stores a hash and restores a server session from an HttpOnly cookie', async () => {
  const row = (await pool.query('select password from auth_accounts where user_id=$1', [a.id]))
    .rows[0];
  assert.ok(row.password);
  assert.notEqual(row.password, password);
  assert.ok(!row.password.includes(password));
  const response = await call('/api/auth/get-session', a.cookie, undefined, 'GET');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, a.id);
  const login = await call('/api/auth/sign-in/email', '', { email: a.email, password });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie') || '', /HttpOnly/i);
  assert.match(login.headers.get('set-cookie') || '', /SameSite=Lax/i);
});
test('invalid credentials and signed-out account requests are rejected', async () => {
  const response = await call('/api/auth/sign-in/email', '', {
    email: a.email,
    password: 'a-wrong-password-123',
  });
  assert.equal(response.status, 401);
  for (const path of ['/api/account/profile', '/api/account/progress'])
    assert.equal((await call(path, '', undefined, 'GET')).status, 401);
});
test('profile creation is idempotent under concurrent account requests and private by default choice', async () => {
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      call('/api/account/profile', a.cookie, { alias: 'TestAccountA', active: false }),
    ),
  );
  assert.ok(responses.every((r) => r.status === 200 || r.status === 201));
  const profiles = await Promise.all(responses.map((r) => r.json()));
  assert.equal(new Set(profiles.map((p) => p.profile.id)).size, 1);
  assert.equal(profiles[0].profile.active, false);
  assert.equal(
    (await pool.query('select count(*)::int as count from players where auth_user_id=$1', [a.id]))
      .rows[0].count,
    1,
  );
});
test('a guest can claim existing verified XP once; the old device ticket is then revoked', async () => {
  const enrollment = await call('/api/players', '', { alias: 'GuestClaimTest' });
  assert.equal(enrollment.status, 201);
  const guest = await enrollment.json();
  guests.push(guest.id);
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + guest.token };
  const issued = await app.request('/api/practice', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: ['warm-up'], bankVersion: BANK_VERSION }),
  });
  const ref = (await issued.json()).refs[0];
  const question = makeQuestion(ref.id, ref.seed);
  const graded = await app.request('/api/answers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ticket: ref.ticket, choice: question.expected, assisted: false }),
  });
  assert.equal((await graded.json()).xp, 20);
  const claimed = await call('/api/account/profile', b.cookie, {
    alias: 'AccountClaimTest',
    active: true,
    guestToken: guest.token,
  });
  assert.equal(claimed.status, 201);
  const profile = await claimed.json();
  assert.equal(profile.claimedGuest, true);
  assert.equal(profile.profile.id, guest.id);
  assert.equal((await app.request('/api/boards', { headers })).status, 401);
  const board = await call('/api/boards', b.cookie, undefined, 'GET');
  assert.equal(board.status, 200);
  assert.equal((await board.json()).weekly.me.xp, 20);
  // A different signed-in account cannot claim it again or take ownership with a known old ticket.
  const c = await signup('c');
  const second = await call('/api/account/profile', c.cookie, {
    alias: 'AnotherTest',
    active: false,
    guestToken: guest.token,
  });
  assert.equal((await second.json()).claimedGuest, false);
});
test('cloud saves are scoped to the authenticated account and do not create league XP', async () => {
  const progress = recordPractice(freshProgress(), makeQuestion('warm-up', 42), false).progress;
  const saved = await call('/api/account/progress', a.cookie, { progress, revision: 0 }, 'PUT');
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).revision, 1);
  const own = await call('/api/account/progress', a.cookie, undefined, 'GET');
  assert.equal((await own.json()).progress.skills['warm-up'].xp, 20);
  const other = await call('/api/account/progress', b.cookie, undefined, 'GET');
  assert.equal((await other.json()).progress, null);
  const ownProfile = (await (await call('/api/account/profile', a.cookie, undefined, 'GET')).json())
    .profile;
  assert.equal(
    (
      await pool.query('select count(*)::int as count from xp_events where player_id=$1', [
        ownProfile.id,
      ])
    ).rows[0].count,
    0,
  );
});
test('stale concurrent progress revisions return a conflict instead of losing a save', async () => {
  const progress = freshProgress();
  const responses = await Promise.all([
    call('/api/account/progress', a.cookie, { progress, revision: 1 }, 'PUT'),
    call('/api/account/progress', a.cookie, { progress, revision: 1 }, 'PUT'),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await (await call('/api/account/progress', a.cookie, undefined, 'GET')).json()).revision,
    2,
  );
});
test('account mutations reject foreign origins, cross-account selectors, and malformed saves', async () => {
  assert.equal(
    (
      await call(
        '/api/account/progress',
        a.cookie,
        { progress: freshProgress(), revision: 2 },
        'PUT',
        'https://not-tracerace.example',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        '/api/me',
        a.cookie,
        { alias: 'Injected', active: true },
        'PATCH',
        'https://not-tracerace.example',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        '/api/account/progress',
        a.cookie,
        { progress: freshProgress(), revision: 2, userId: b.id },
        'PUT',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        '/api/account/progress',
        a.cookie,
        { progress: { version: 999 }, revision: 2 },
        'PUT',
      )
    ).status,
    400,
  );
});
test('profile editing and ranking visibility persist without disclosing an email on the board', async () => {
  const response = await call(
    '/api/me',
    a.cookie,
    { alias: 'UpdatedAccount', active: true },
    'PATCH',
  );
  assert.equal(response.status, 200);
  const board = await call('/api/boards', a.cookie, undefined, 'GET');
  const text = await board.text();
  assert.ok(text.includes('UpdatedAccount'));
  assert.ok(!text.includes(a.email));
  assert.ok(!text.includes('token_hash'));
  assert.equal((await call('/api/me', a.cookie, { active: false }, 'PATCH')).status, 200);
});
test('sign-out revokes the session rather than merely clearing client UI', async () => {
  const c = await signup('signout');
  assert.equal((await call('/api/auth/sign-out', c.cookie, {})).status, 200);
  assert.equal((await call('/api/account/progress', c.cookie, undefined, 'GET')).status, 401);
});
test('deleting an account cascades its progress and rankings while leaving other accounts intact', async () => {
  const c = await signup('delete');
  const profile = (
    await (
      await call('/api/account/profile', c.cookie, { alias: 'DeleteTest', active: false })
    ).json()
  ).profile;
  await call('/api/account/progress', c.cookie, { progress: freshProgress(), revision: 0 }, 'PUT');
  const deleted = await call('/api/auth/delete-user', c.cookie, { password });
  assert.equal(deleted.status, 200, await deleted.clone().text());
  assert.equal(
    (await pool.query('select count(*)::int as count from players where id=$1', [profile.id]))
      .rows[0].count,
    0,
  );
  assert.equal(
    (await pool.query('select count(*)::int as count from cloud_progress where user_id=$1', [c.id]))
      .rows[0].count,
    0,
  );
  assert.equal((await call('/api/account/progress', c.cookie, undefined, 'GET')).status, 401);
  assert.equal((await call('/api/account/profile', a.cookie, undefined, 'GET')).status, 200);
});

test('course drafts and paper answers round-trip privately while new C++ tickets grade on the server', async () => {
  const owner = await signup('course-owner'),
    other = await signup('course-other');
  const progress = freshProgress();
  progress.cscb07 = beginCourseSession(
    updateConcept(progress.cscb07, 'values', (c) => ({ ...c, readAt: '2026-11-09T15:00:00Z' })),
    'values',
    'learn',
    42,
  );
  progress.cscb07.startedDay = '2026-11-09';
  progress.cscb07.written.assignment = {
    answer: 'Node tmp{other}; swap(tmp); return *this;',
    scaffold: 'blank',
    submittedAt: null,
    checks: [],
    rating: 'unreviewed',
  };
  progress.cscb07.papers.a = {
    minutes: 90,
    startedAt: '2026-11-09T15:00:00Z',
    submittedAt: null,
    onPaper: false,
    answers: { p0: '8 8' },
    checks: {},
  };
  const saved = await call('/api/account/progress', owner.cookie, { progress, revision: 0 }, 'PUT');
  assert.equal(saved.status, 200);
  const returned = await (
    await call('/api/account/progress', owner.cookie, undefined, 'GET')
  ).json();
  assert.deepEqual(returned.progress.cscb07, progress.cscb07);
  assert.equal(
    (await (await call('/api/account/progress', other.cookie, undefined, 'GET')).json()).progress,
    null,
  );
  const profile = await call('/api/account/profile', owner.cookie, {
    alias: 'CoursePrivateTest',
    active: false,
  });
  assert.equal(profile.status, 201);
  const issued = await call('/api/practice', owner.cookie, {
    ids: ['b07-l1-alias'],
    bankVersion: BANK_VERSION,
  });
  assert.equal(issued.status, 200);
  const ref = (await issued.json()).refs[0],
    q = makeQuestion(ref.id, ref.seed);
  const graded = await call('/api/answers', owner.cookie, {
    ticket: ref.ticket,
    choice: q.expected,
    assisted: false,
  });
  assert.equal(graded.status, 200);
  assert.equal((await graded.json()).correct, true);
});
