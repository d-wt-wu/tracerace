import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHALLENGES } from '../src/content/curriculum';
import { makeQuestion, freshVariant } from '../src/content/bank';
import {
  freshProgress,
  recordPractice,
  totalXP,
  dayCount,
  decodeProgress,
  recordSolve,
} from '../src/state/progress';
import { newDraft } from '../src/domain/assessment';
const ids = CHALLENGES.map((c) => c.id);
test('version 1 saves retain XP, mastery, dates, and preferences during migration', () => {
  const legacy = {
    version: 1,
    skills: {
      'warm-up': {
        solves: 1,
        firstTry: 1,
        lastReviewed: '2026-11-06',
        due: '2026-11-07',
        stage: 0,
        xp: 20,
      },
    },
    days: { '2026-11-06': ['warm-up'] },
    haptics: false,
  };
  const result = decodeProgress(JSON.stringify(legacy), ids);
  assert.equal(result.version, 2);
  assert.equal(totalXP(result), 20);
  assert.equal(result.skills['warm-up'].due, '2026-11-07');
  assert.equal(result.haptics, false);
  assert.equal(result.assessments.length, 0);
  assert.equal(result.assessmentDraft, null);
});
test('new families earn 20/10, new variants 5/2, duplicates zero', () => {
  const q = makeQuestion('warm-up', 1),
    q2 = freshVariant(q.id, 1, [q.variantId]),
    q3 = freshVariant(q.id, 2, [q.variantId, q2.variantId]);
  const a = recordPractice(freshProgress(), q, false, '2026-11-06');
  assert.equal(a.earned, 20);
  const duplicate = recordPractice(a.progress, q, false, '2026-11-06');
  assert.equal(duplicate.earned, 0);
  assert.equal(duplicate.progress, a.progress);
  const b = recordPractice(a.progress, q2, false, '2026-11-06');
  assert.equal(b.earned, 5);
  const c = recordPractice(b.progress, q3, true, '2026-11-06');
  assert.equal(c.earned, 2);
  assert.equal(totalXP(c.progress), 27);
  assert.equal(dayCount(c.progress, '2026-11-06'), 3);
  assert.equal(recordPractice(freshProgress(), q, true, '2026-11-06').earned, 10);
});
test('independent same-day variants do not fast-forward spaced review', () => {
  const q = makeQuestion('warm-up', 1),
    q2 = freshVariant(q.id, 1, [q.variantId]);
  let p = recordPractice(freshProgress(), q, false, '2026-11-06').progress;
  p = recordPractice(p, q2, false, '2026-11-06').progress;
  assert.equal(p.skills[q.id].due, '2026-11-07');
  assert.equal(p.skills[q.id].stage, 0);
  assert.equal(p.skills[q.id].solves, 2);
});
test('a helped variant brings a familiar family back tomorrow', () => {
  const q = makeQuestion('warm-up', 1);
  let p = recordSolve(freshProgress(), q.id, false, '2026-11-06').progress;
  p = recordSolve(p, q.id, false, '2026-11-07').progress;
  const changed = recordPractice(p, q, true, '2026-11-07').progress;
  assert.equal(changed.skills[q.id].stage, 0);
  assert.equal(changed.skills[q.id].due, '2026-11-08');
});
test('assessment draft answers survive a save-and-resume round trip', () => {
  const p = freshProgress();
  p.assessmentDraft = newDraft(42);
  p.assessmentDraft.answers[0] = '__skip__';
  assert.deepEqual(decodeProgress(JSON.stringify(p), ids), p);
});
test('invalid practice rewards and unsupported save versions are not silently accepted', () => {
  const p = freshProgress();
  p.rewards.push({ familyId: 'warm-up', variantId: 'fake', day: '2026-11-06', xp: 999 });
  assert.throws(() => decodeProgress(JSON.stringify(p), ids));
  assert.throws(() => decodeProgress(JSON.stringify({ ...freshProgress(), version: 3 }), ids));
});
