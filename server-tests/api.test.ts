import { databaseURL } from '../server/database-url';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { createApi } from '../server/api';
import {
  BANK_VERSION,
  FAMILIES,
  makeQuestion,
  questionMaterial,
  type QuestionRef,
} from '../src/content/bank';
import { gradeAssessment, type AssessmentDraft } from '../src/domain/assessment';
import { issueTicket } from '../server/tickets';
import type { PlayerIdentity, Boards } from '../src/domain/league';

if (!process.env.DATABASE_URL) throw new Error('A migrated development database is required.');
if (process.env.NEON_BRANCH === 'main')
  throw new Error('API tests must run on a development branch, not main.');
const pool = new Pool({ connectionString: databaseURL(process.env.DATABASE_URL), max: 5 });
const key = 'test-signing-key-' + randomBytes(24).toString('hex'),
  prefix = 'test-' + randomBytes(6).toString('hex');
let now = new Date('2099-01-05T12:00:00Z');
const app = createApi(pool, key, { clock: () => now, quotaPrefix: prefix });
const users: PlayerIdentity[] = [];
const headers = (p?: PlayerIdentity) => ({
  'Content-Type': 'application/json',
  ...(p ? { Authorization: 'Bearer ' + p.token } : {}),
});
async function call(path: string, p?: PlayerIdentity, body?: unknown, method = 'POST') {
  return app.request(path, {
    method,
    headers: headers(p),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function enroll(alias: string) {
  const response = await call('/api/players', undefined, { alias });
  assert.equal(response.status, 201);
  const p = (await response.json()) as PlayerIdentity;
  users.push(p);
  return p;
}
let a: PlayerIdentity, b: PlayerIdentity;
before(async () => {
  a = await enroll('TestAlpha');
  b = await enroll('TestBeta');
});
after(async () => {
  // Delete only records created by this test; never truncate shared data.
  for (const user of users) {
    for (const table of ['xp_events', 'family_solves', 'practice_attempts', 'assessment_runs'])
      await pool.query('delete from ' + table + ' where player_id=$1', [user.id]);
    await pool.query('delete from players where id=$1', [user.id]);
  }
  await pool.query('delete from api_quotas where key like $1', [prefix + ':%']);
  await pool.end();
});
async function question(p: PlayerIdentity, id = 'warm-up') {
  const response = await call('/api/practice', p, { ids: [id], bankVersion: BANK_VERSION });
  assert.equal(response.status, 200);
  const data = (await response.json()) as { refs: QuestionRef[] };
  return { ref: data.refs[0], q: makeQuestion(data.refs[0].id, data.refs[0].seed) };
}
test('online boards require a valid player ticket and expose no credentials', async () => {
  const denied = await call('/api/boards', undefined, undefined, 'GET');
  assert.equal(denied.status, 401);
  const response = await call('/api/boards', a, undefined, 'GET');
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.ok(!text.includes(a.token));
  assert.ok(!text.includes('token_hash'));
});
test('arbitrary XP fields and unsigned question tickets cannot change rankings', async () => {
  assert.equal((await call('/api/answers', a, { xp: 99999 })).status, 400);
  assert.equal(
    (await call('/api/answers', a, { ticket: 'invented', choice: '7', assisted: false })).status,
    403,
  );
  const { ref, q } = await question(a);
  assert.equal(
    (await call('/api/answers', b, { ticket: ref.ticket, choice: q.expected, assisted: false }))
      .status,
    403,
  );
});
test('concurrent duplicate correct submissions award points exactly once', async () => {
  const { ref, q } = await question(a);
  const responses = await Promise.all(
    Array.from({ length: 4 }, () =>
      call('/api/answers', a, { ticket: ref.ticket, choice: q.expected, assisted: false }),
    ),
  );
  const receipts = await Promise.all(responses.map((r) => r.json()));
  assert.deepEqual(
    receipts.map((r) => r.xp).sort((x, y) => x - y),
    [0, 0, 0, 20],
  );
});
test('server remembers a wrong attempt even if the client later claims no help', async () => {
  const { ref, q } = await question(a, 'copy-not-link');
  const wrong = q.choices.find((c) => c.value !== q.expected)!.value;
  assert.equal(
    (await call('/api/answers', a, { ticket: ref.ticket, choice: wrong, assisted: false })).status,
    200,
  );
  const result = await (
    await call('/api/answers', a, { ticket: ref.ticket, choice: q.expected, assisted: false })
  ).json();
  assert.equal(result.correct, true);
  assert.equal(result.xp, 10);
});
test('a genuinely different variant gets the smaller repeat-family reward', async () => {
  const first = await question(b),
    firstReceipt = await (
      await call('/api/answers', b, {
        ticket: first.ref.ticket,
        choice: first.q.expected,
        assisted: false,
      })
    ).json();
  assert.equal(firstReceipt.xp, 20);
  let next = await question(b);
  for (let i = 0; i < 32 && questionMaterial(next.q) === questionMaterial(first.q); i++)
    next = await question(b);
  assert.notEqual(questionMaterial(next.q), questionMaterial(first.q));
  const result = await (
    await call('/api/answers', b, {
      ticket: next.ref.ticket,
      choice: next.q.expected,
      assisted: false,
    })
  ).json();
  assert.equal(result.xp, 5);
});
test('ranked assessments reject score injection and enforce run ownership', async () => {
  const response = await call('/api/assessments', a, { bankVersion: BANK_VERSION });
  assert.equal(response.status, 201);
  const draft = (await response.json()) as AssessmentDraft;
  const answers = draft.refs.map((ref) => makeQuestion(ref.id, ref.seed).expected);
  assert.equal(
    (await call('/api/assessments/' + draft.id + '/finish', a, { answers, score: 100 })).status,
    400,
  );
  assert.equal(
    (await call('/api/assessments/' + draft.id + '/finish', b, { answers })).status,
    404,
  );
  const done = await (
    await call('/api/assessments/' + draft.id + '/finish', a, { answers })
  ).json();
  assert.equal(done.score, 100);
  assert.equal(done.ranked, true);
  const repeat = await (
    await call('/api/assessments/' + draft.id + '/finish', a, {
      answers: Array(18).fill('__skip__'),
    })
  ).json();
  assert.equal(repeat.score, 100);
});
test('the skill board uses the latest completed assessment, including a lower result', async () => {
  now = new Date(now.getTime() + 1000);
  const draft = (await (
    await call('/api/assessments', a, { bankVersion: BANK_VERSION })
  ).json()) as AssessmentDraft;
  const response = await call('/api/assessments/' + draft.id + '/finish', a, {
    answers: Array(18).fill('__skip__'),
  });
  assert.equal(response.status, 200);
  const board = (await (await call('/api/boards', a, undefined, 'GET')).json()) as Boards;
  assert.equal(board.skills.me?.score, 0);
});
test('public ranking visibility can be paused and restored without losing verified XP', async () => {
  const beforeBoard = (await (await call('/api/boards', a, undefined, 'GET')).json()) as Boards;
  assert.equal((await call('/api/me', a, { active: false }, 'PATCH')).status, 200);
  const hidden = (await (await call('/api/boards', b, undefined, 'GET')).json()) as Boards;
  assert.ok(!hidden.weekly.rows.some((r) => r.id === a.id));
  assert.ok(!hidden.skills.rows.some((r) => r.id === a.id));
  await call('/api/me', a, { active: true }, 'PATCH');
  const restored = (await (await call('/api/boards', a, undefined, 'GET')).json()) as Boards;
  assert.equal(restored.weekly.me?.xp, beforeBoard.weekly.me?.xp);
});
test('weekly scores reset at the next UTC week without resetting learned families', async () => {
  now = new Date('2099-01-12T00:00:00Z');
  const boards = (await (await call('/api/boards', a, undefined, 'GET')).json()) as Boards;
  assert.equal(boards.weekly.me?.xp, 0);
  const q = makeQuestion('warm-up', 123),
    ticket = issueTicket(key, a.id, q.id, q.seed, now.getTime());
  const result = await (
    await call('/api/answers', a, { ticket, choice: q.expected, assisted: false })
  ).json();
  assert.equal(result.xp, 5);
});
test('the daily league cap is enforced by the database-side transaction', async () => {
  const p = await enroll('TestDailyCap'),
    day = now.toISOString().slice(0, 10);
  await pool.query(
    "insert into xp_events(player_id,variant,day,week,xp) select $1, 'cap-fixture-'||i, $2::date, $2::date, 20 from generate_series(1,25) i",
    [p.id, day],
  );
  const { ref, q } = await question(p, 'stack-top');
  const result = await (
    await call('/api/answers', p, { ticket: ref.ticket, choice: q.expected, assisted: false })
  ).json();
  assert.equal(result.xp, 0);
  assert.equal(result.capped, true);
});
test('generated SQL answers independently match PostgreSQL execution', async () => {
  for (const family of FAMILIES.filter((f) => f.language === 'SQL'))
    for (let seed = 0; seed < 12; seed++) {
      const q = makeQuestion(family.id, seed),
        result = await pool.query(q.code);
      assert.equal(String(Object.values(result.rows[0])[0]), q.expected, family.id + ':' + seed);
    }
});
test('server and client assessment formulas agree on the same issued references', async () => {
  const draft = (await (
    await call('/api/assessments', b, { bankVersion: BANK_VERSION })
  ).json()) as AssessmentDraft;
  const answers = draft.refs.map((ref, i) =>
    i % 3 ? makeQuestion(ref.id, ref.seed).expected : '__skip__',
  );
  const expected = gradeAssessment(draft.refs, answers, draft.id);
  const result = await (
    await call('/api/assessments/' + draft.id + '/finish', b, { answers })
  ).json();
  assert.equal(result.score, expected.score);
  assert.equal(result.earned, expected.earned);
});
