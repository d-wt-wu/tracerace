import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { makeQuestion, BANK_VERSION, type QuestionRef } from '../src/content/bank';
import { databaseURL } from '../server/database-url';
if (process.env.NEON_BRANCH === 'main' || !process.env.NEON_BRANCH_ID)
  throw new Error('Use an isolated development branch.');
const base = process.env.TRACERACE_SMOKE_URL;
if (!base || !base.includes(process.env.NEON_BRANCH_ID))
  throw new Error('The smoke URL must match this development branch.');
const pool = new Pool({ connectionString: databaseURL(process.env.DATABASE_URL), max: 2 });
let player: { id: string; token: string } | null = null;
async function post(path: string, body: unknown, method = 'POST') {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(player ? { Authorization: 'Bearer ' + player.token } : {}),
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  assert.ok(response.ok, path + ': HTTP ' + response.status);
  return response.json();
}
async function main() {
  try {
    player = await post('/api/players', { alias: 'QA_Smoke_' + randomBytes(3).toString('hex') });
    const issued = await post('/api/practice', { ids: ['warm-up'], bankVersion: BANK_VERSION });
    const ref = issued.refs[0] as QuestionRef,
      q = makeQuestion(ref.id, ref.seed);
    const receipt = await post('/api/answers', {
      ticket: ref.ticket,
      choice: q.expected,
      assisted: false,
    });
    assert.equal(receipt.xp, 20);
    const board = await post('/api/boards', undefined, 'GET');
    assert.equal(board.weekly.me.xp, 20);
    const run = await post('/api/assessments', { bankVersion: BANK_VERSION });
    const result = await post('/api/assessments/' + run.id + '/finish', {
      answers: run.refs.map((r: QuestionRef) => makeQuestion(r.id, r.seed).expected),
    });
    assert.equal(result.score, 100);
    assert.equal(result.ranked, true);
    await post('/api/me', { active: false }, 'PATCH');
    console.log(
      'Deployed HTTPS API verified: enrollment, issued questions, grading, weekly board, assessment, and visibility.',
    );
  } finally {
    if (player) {
      for (const table of ['xp_events', 'practice_attempts', 'family_solves', 'assessment_runs'])
        await pool.query('delete from ' + table + ' where player_id=$1', [player.id]);
      await pool.query('delete from players where id=$1', [player.id]);
      console.log('Removed only the temporary smoke-test profile and its records.');
    }
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Smoke test failed');
  process.exitCode = 1;
});
