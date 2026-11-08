import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dateKey,
  decodeProgress,
  dueIds,
  freshProgress,
  recordSolve,
  shiftDay,
  streak,
  totalXP,
} from '../src/state/progress';

test('a new independent solve earns 20 XP, an assisted solve earns 10', () => {
  let p = recordSolve(freshProgress(), 'a', false, '2026-11-06').progress;
  p = recordSolve(p, 'b', true, '2026-11-06').progress;
  assert.equal(totalXP(p), 30);
  assert.equal(p.skills.a.firstTry, 1);
  assert.equal(p.skills.b.firstTry, 0);
});
test('double taps, retries, and later reviews cannot farm XP', () => {
  const a = recordSolve(freshProgress(), 'a', false, '2026-11-06');
  const b = recordSolve(a.progress, 'a', false, '2026-11-06');
  assert.equal(b.earned, 0);
  assert.equal(b.progress, a.progress);
  const c = recordSolve(b.progress, 'a', false, '2026-11-07');
  assert.equal(c.earned, 0);
  assert.equal(totalXP(c.progress), 20);
  assert.equal(c.progress.skills.a.solves, 2);
});
test('review intervals increase with independent recall and reset after help', () => {
  let p = recordSolve(freshProgress(), 'a', false, '2026-11-06').progress;
  assert.equal(p.skills.a.due, '2026-11-07');
  p = recordSolve(p, 'a', false, '2026-11-07').progress;
  assert.equal(p.skills.a.due, '2026-11-10');
  p = recordSolve(p, 'a', false, '2026-11-10').progress;
  assert.equal(p.skills.a.due, '2026-11-17');
  p = recordSolve(p, 'a', false, '2026-11-17').progress;
  assert.equal(p.skills.a.due, '2026-12-01');
  p = recordSolve(p, 'a', true, '2026-12-01').progress;
  assert.equal(p.skills.a.due, '2026-12-02');
  assert.equal(p.skills.a.stage, 0);
});
test('streak spans consecutive local dates and permits today not started', () => {
  let p = freshProgress();
  for (const d of ['2026-11-03', '2026-11-04', '2026-11-05'])
    p = recordSolve(p, 'a', false, d).progress;
  assert.equal(streak(p, '2026-11-06'), 3);
  assert.equal(streak(p, '2026-11-07'), 0);
  p = recordSolve(p, 'b', false, '2026-11-06').progress;
  assert.equal(streak(p, '2026-11-06'), 4);
});
test('review queue contains only due skills in due-date order', () => {
  let p = recordSolve(freshProgress(), 'a', false, '2026-11-06').progress;
  p = recordSolve(p, 'b', false, '2026-11-05').progress;
  assert.deepEqual(dueIds(p, '2026-11-06'), ['b']);
  assert.deepEqual(dueIds(p, '2026-11-07'), ['b', 'a']);
});
test('calendar arithmetic crosses month, year, leap day, and daylight saving', () => {
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDay('2028-02-28', 1), '2028-02-29');
  assert.equal(shiftDay('2026-11-01', 1), '2026-11-02');
  assert.equal(shiftDay('2027-03-14', 1), '2027-03-15');
  assert.equal(dateKey(new Date(2026, 10, 6, 23, 59)), '2026-11-06');
});
test('progress round trips, drops obsolete IDs, and deduplicates day activity', () => {
  let p = recordSolve(freshProgress(), 'a', false, '2026-11-06').progress;
  p = recordSolve(p, 'removed', true, '2026-11-06').progress;
  p.days['2026-11-06'].push('a');
  const parsed = decodeProgress(JSON.stringify(p), ['a']);
  assert.deepEqual(Object.keys(parsed.skills), ['a']);
  assert.deepEqual(parsed.days['2026-11-06'], ['a']);
  assert.equal(totalXP(parsed), 20);
});
test('empty storage starts fresh; corrupt and future saves are not silently replaced', () => {
  assert.deepEqual(decodeProgress(null, []), freshProgress());
  for (const value of [
    '{',
    'null',
    '[]',
    '{"version":2}',
    '{"version":1,"skills":[],"days":{}}',
    '{"version":1,"skills":{},"days":[]}',
  ])
    assert.throws(() => decodeProgress(value, []));
});
test('invalid dates and impossible skill statistics are rejected', () => {
  const base = recordSolve(freshProgress(), 'a', false, '2026-11-06').progress;
  for (const mutate of [
    (p: typeof base) => {
      p.skills.a.due = '2026-02-30';
    },
    (p: typeof base) => {
      p.skills.a.firstTry = 4;
    },
    (p: typeof base) => {
      p.skills.a.xp = 999;
    },
    (p: typeof base) => {
      p.days.bad = ['a'];
    },
  ]) {
    const copy = structuredClone(base);
    mutate(copy);
    assert.throws(() => decodeProgress(JSON.stringify(copy), ['a']));
  }
});
test('a solve does not mutate the previous progress object', () => {
  const old = freshProgress();
  recordSolve(old, 'a', false, '2026-11-06');
  assert.deepEqual(old, freshProgress());
});
