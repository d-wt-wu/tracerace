import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyPlan, dailyQuestions } from '../src/domain/daily';
import { CHALLENGES } from '../src/content/curriculum';
import { freshProgress, recordSolve, recordPractice } from '../src/state/progress';

test('daily practice starts with three distinct known question families and is deterministic', () => {
  const p = freshProgress();
  const plan = dailyPlan(p, '2026-11-08');
  assert.equal(plan.length, 3);
  assert.equal(new Set(plan.map((q) => q.id)).size, 3);
  assert.ok(plan.every((q) => q.reason === 'new' && CHALLENGES.some((c) => c.id === q.id)));
  assert.deepEqual(dailyQuestions(p, '2026-11-08'), dailyQuestions(p, '2026-11-08'));
});
test('an overdue concept needing help is prioritized while reserving room for something new', () => {
  let p = recordSolve(freshProgress(), CHALLENGES[1].id, false, '2026-11-06').progress;
  p = recordSolve(p, CHALLENGES[0].id, true, '2026-11-06').progress;
  const plan = dailyPlan(p, '2026-11-08');
  assert.equal(plan[0].id, CHALLENGES[0].id);
  assert.deepEqual(
    plan.map((q) => q.reason),
    ['review', 'review', 'new'],
  );
});
test('a just-completed family is not immediately repeated in the next daily session', () => {
  const p = recordSolve(freshProgress(), CHALLENGES[0].id, true, '2026-11-08').progress;
  assert.ok(!dailyPlan(p, '2026-11-08').some((q) => q.id === CHALLENGES[0].id));
});
test('review selection respects old due dates and does not mutate the saved progress', () => {
  let p = recordSolve(freshProgress(), CHALLENGES[1].id, true, '2026-11-04').progress;
  p = recordSolve(p, CHALLENGES[0].id, true, '2026-11-06').progress;
  const before = JSON.stringify(p);
  assert.equal(dailyPlan(p, '2026-11-08')[0].id, CHALLENGES[1].id);
  assert.equal(JSON.stringify(p), before);
});
test('fresh daily variants avoid a recently rewarded variant', () => {
  const p = freshProgress();
  const first = dailyQuestions(p, '2026-11-08')[0];
  p.rewards.push({ familyId: first.id, variantId: first.variantId, day: '2026-11-07', xp: 20 });
  assert.notEqual(dailyQuestions(p, '2026-11-08')[0].variantId, first.variantId);
});
test('practicing early does not extend the interval; due recall advances it and help resets it', () => {
  const id = CHALLENGES[0].id;
  let p = recordSolve(freshProgress(), id, false, '2026-11-01').progress;
  p = recordSolve(p, id, false, '2026-11-02').progress;
  assert.equal(p.skills[id].due, '2026-11-05');
  p = recordSolve(p, id, false, '2026-11-03').progress;
  assert.equal(p.skills[id].stage, 1);
  assert.equal(p.skills[id].due, '2026-11-05');
  p = recordSolve(p, id, false, '2026-11-05').progress;
  assert.equal(p.skills[id].stage, 2);
  assert.equal(p.skills[id].due, '2026-11-12');
  p = recordSolve(p, id, true, '2026-11-06').progress;
  assert.equal(p.skills[id].stage, 0);
  assert.equal(p.skills[id].due, '2026-11-07');
});
test('a solved daily session changes the following plan and retains existing XP rules', () => {
  let p = freshProgress();
  const session = dailyQuestions(p, '2026-11-08');
  for (const q of session) p = recordPractice(p, q, false, '2026-11-08').progress;
  assert.ok(dailyPlan(p, '2026-11-08').every((q) => !session.some((old) => old.id === q.id)));
  assert.equal(
    Object.values(p.skills).reduce((sum, skill) => sum + skill.xp, 0),
    60,
  );
});
