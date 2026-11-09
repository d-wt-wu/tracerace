import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CSCB07_LESSONS } from '../src/content/cscb07/lessons';
import { WRITTEN_TASKS, paperProblems } from '../src/content/cscb07/written';
import { CSCB07_FAMILIES } from '../src/content/cscb07';
import { FAMILIES, freshVariant, makeQuestion, questionMaterial } from '../src/content/bank';
import { assessmentRefs } from '../src/domain/assessment';
import {
  advanceCourseQuestion,
  beginCourseSession,
  conceptProgress,
  conceptStatus,
  coursePlan,
  decodeCourse,
  finishCourseSession,
  freshCourse,
  logCourseHint,
  readyForLesson,
  recordCourseAnswer,
  torontoDay,
  updateConcept,
  type CourseProgress,
} from '../src/domain/course';
import { decodeProgress, freshProgress } from '../src/state/progress';
import { cloudSnapshot, reconcileProgress } from '../src/domain/sync';

const monday = new Date('2026-11-09T15:00:00Z');
const read = (p: CourseProgress, id = 'values') =>
  updateConcept(p, id, (c) => ({ ...c, readAt: monday.toISOString() }));
function independent(p: CourseProgress, variant: string, at: Date) {
  p = updateConcept(p, 'values', (c) => ({
    ...c,
    session: {
      seed: 42,
      family: 'b07-l1-basic-values',
      index: 2,
      mode: 'learn',
      answer: '8',
      checked: false,
      wrong: false,
      hinted: false,
    },
  }));
  return recordCourseAnswer(p, 'values', 'b07-l1-basic-values', variant, true, at);
}
test('the scoped course has 24 teach-before-test lessons, 96 initial items, and 12 written tasks', () => {
  assert.equal(CSCB07_LESSONS.length, 24);
  assert.equal(WRITTEN_TASKS.length, 12);
  const all = new Set(FAMILIES.map((f) => f.id));
  for (const l of CSCB07_LESSONS) {
    assert.ok(
      l.objective &&
        l.vocabulary.length >= 3 &&
        l.example.steps.length >= 3 &&
        l.families.length >= 2,
      l.id,
    );
    assert.ok(
      l.families.every((id) => all.has(id)),
      l.id,
    );
    assert.ok(l.reading.every((r) => r.lecture <= 6));
    for (const r of l.reading.filter((r) => r.lecture === 6)) assert.equal(r.pages, '1–3');
  }
  assert.ok(
    !CSCB07_LESSONS.some((l) => /inheritance|polymorphism|virtual|modelling/i.test(l.title)),
  );
  assert.equal(CSCB07_FAMILIES.length, 69);
});
test('Monday starts with zero course credit and the first seven lessons, never Sunday completion', () => {
  const p = freshCourse(),
    plan = coursePlan(p, monday);
  assert.equal(plan.today, '2026-11-09');
  assert.equal(plan.start, '2026-11-09');
  assert.equal(plan.newLessons.length, 7);
  assert.equal(plan.remaining.length, 24);
  assert.equal(plan.due.length, 0);
  assert.equal(plan.newLessons[0].id, 'values');
  assert.ok(plan.writtenToday.some((t) => t.id === 'repair-memory'));
});
test('a later first start compresses the plan and surfaces insufficient time', () => {
  const p = { ...freshCourse(), startedDay: '2026-11-11' };
  const plan = coursePlan(p, new Date('2026-11-11T15:00:00Z'));
  assert.equal(plan.newLessons.length, 12);
  assert.ok(plan.extraMinutes > 0);
  const friday = coursePlan(p, new Date('2026-11-13T15:00:00Z'));
  assert.equal(friday.isWarmup, true);
  assert.equal(friday.suggestedMinutes, 20);
  assert.equal(friday.newLessons.length, 0);
  assert.equal(friday.remaining.length, 24);
});
test('reading and prerequisites are required before normal practice; retrieval cannot bypass them', () => {
  assert.equal(readyForLesson(freshCourse(), 'values'), true);
  assert.equal(readyForLesson(freshCourse(), 'functions'), false);
  assert.throws(() => beginCourseSession(freshCourse(), 'values', 'learn', 42));
  assert.throws(() =>
    beginCourseSession(read(freshCourse(), 'functions'), 'functions', 'learn', 42),
  );
  assert.throws(() => beginCourseSession(read(freshCourse()), 'values', 'review', 42));
});
test('guided successes and a wrong-then-correct retry never count as independent', () => {
  let p = beginCourseSession(read(freshCourse()), 'values', 'learn', 42);
  p = recordCourseAnswer(p, 'values', 'b07-l1-basic-values', 'first', true, monday);
  assert.equal(conceptProgress(p, 'values').supported, 1);
  assert.equal(conceptProgress(p, 'values').independent, 0);
  p = advanceCourseQuestion(p, 'values');
  p = recordCourseAnswer(p, 'values', 'b07-l1-basic-comparison', 'second', false, monday);
  p = recordCourseAnswer(p, 'values', 'b07-l1-basic-comparison', 'second', true, monday);
  const c = conceptProgress(p, 'values');
  assert.equal(c.incorrect, 1);
  assert.equal(c.supported, 2);
  assert.equal(c.independent, 0);
});
test('hints are counted once per item and errors schedule a same-day repair', () => {
  let p = beginCourseSession(read(freshCourse()), 'values', 'learn', 42);
  p = logCourseHint(logCourseHint(p, 'values'), 'values');
  assert.equal(conceptProgress(p, 'values').hints, 1);
  p = recordCourseAnswer(p, 'values', 'b07-l1-basic-values', 'bad', false, monday);
  assert.equal(conceptProgress(p, 'values').nextReviewAt, '2026-11-09T15:20:00.000Z');
  assert.equal(coursePlan(p, new Date('2026-11-09T15:21:00Z')).due[0].id, 'values');
});
test('secure needs fresh independent success and delayed retrieval, and a new error revokes it', () => {
  let p = read(freshCourse());
  p = independent(p, 'v1', monday);
  p = independent(p, 'v2', new Date('2026-11-09T15:01:00Z'));
  assert.notEqual(conceptStatus(conceptProgress(p, 'values')), 'secure');
  p = independent(p, 'v3', new Date('2026-11-09T19:01:00Z'));
  assert.equal(conceptStatus(conceptProgress(p, 'values')), 'secure');
  p = updateConcept(p, 'values', (c) => ({ ...c, session: { ...c.session!, checked: false } }));
  p = recordCourseAnswer(
    p,
    'values',
    'b07-l1-basic-values',
    'v4',
    false,
    new Date('2026-11-09T19:02:00Z'),
  );
  assert.notEqual(conceptStatus(conceptProgress(p, 'values')), 'secure');
  p = independent(p, 'v5', new Date('2026-11-09T19:03:00Z'));
  assert.notEqual(conceptStatus(conceptProgress(p, 'values')), 'secure');
});
test('repeating identical independently correct content does not manufacture new mastery', () => {
  let p = independent(read(freshCourse()), 'same', monday);
  p = independent(p, 'same', new Date('2026-11-10T15:00:00Z'));
  assert.equal(conceptProgress(p, 'values').independent, 1);
  assert.equal(conceptProgress(p, 'values').delayed, 0);
});
test('session completion requires four practiced items and an independent answer', () => {
  let p = beginCourseSession(read(freshCourse()), 'values', 'learn', 42);
  assert.throws(() => finishCourseSession(p, 'values'));
  p = updateConcept(p, 'values', (c) => ({ ...c, session: { ...c.session!, index: 4 } }));
  assert.throws(() => finishCourseSession(p, 'values'));
  p = updateConcept(p, 'values', (c) => ({ ...c, independent: 1 }));
  p = finishCourseSession(p, 'values', monday);
  assert.equal(readyForLesson(p, 'functions'), true);
});
test('repair changes material when possible and saved question identity stays stable', () => {
  let p = beginCourseSession(read(freshCourse()), 'values', 'learn', 42);
  const first = makeQuestion(p.concepts.values.session!.family, p.concepts.values.session!.seed);
  p = recordCourseAnswer(p, 'values', first.id, first.variantId, false, monday);
  const same = makeQuestion(p.concepts.values.session!.family, p.concepts.values.session!.seed);
  assert.equal(first.variantId, same.variantId);
  p = advanceCourseQuestion(p, 'values', true);
  const next = makeQuestion(p.concepts.values.session!.family, p.concepts.values.session!.seed);
  assert.notEqual(next.variantId, first.variantId);
  assert.equal(freshVariant(first.id, first.seed, [first.variantId]).id, first.id);
});
test('course progress, drafts, paper timer, and self-review round-trip through existing private saves', () => {
  const p = freshProgress();
  p.cscb07 = beginCourseSession(read(p.cscb07), 'values', 'learn', 42);
  p.cscb07.startedDay = '2026-11-09';
  p.cscb07.written['transfer-count'] = {
    answer: 'int count = 0;',
    scaffold: 'blank',
    submittedAt: monday.toISOString(),
    checks: [true],
    rating: 'self-independent',
    onPaper: false,
  };
  p.cscb07.papers.a = {
    minutes: 90,
    startedAt: monday.toISOString(),
    submittedAt: null,
    onPaper: false,
    answers: { p0: '8 8' },
    checks: {},
  };
  const restored = decodeProgress(
    cloudSnapshot(p),
    FAMILIES.map((f) => f.id),
  );
  assert.deepEqual(restored.cscb07, p.cscb07);
  assert.equal(conceptStatus(conceptProgress(restored.cscb07, 'values')), 'learning');
  assert.equal(
    reconcileProgress(p, null, { revision: 3, progress: freshProgress() }).conflict,
    true,
  );
});
test('old version-two saves without course state retain their practice and receive an empty course', () => {
  const p = freshProgress();
  const old = JSON.parse(JSON.stringify(p));
  delete old.cscb07;
  const restored = decodeProgress(
    JSON.stringify(old),
    FAMILIES.map((f) => f.id),
  );
  assert.deepEqual(restored.cscb07, freshCourse());
});
test('malformed course payloads and oversized written responses are rejected', () => {
  assert.throws(() => decodeCourse({ ...freshCourse(), budget: -1 }));
  assert.throws(() => decodeCourse({ ...freshCourse(), version: 99 }));
  assert.throws(() =>
    decodeCourse({
      ...freshCourse(),
      written: {
        assignment: {
          answer: 'x'.repeat(4001),
          scaffold: 'blank',
          submittedAt: null,
          checks: [],
          rating: 'unreviewed',
        },
      },
    }),
  );
  assert.throws(() =>
    decodeCourse({
      ...freshCourse(),
      papers: {
        a: {
          minutes: 90,
          startedAt: 'not-a-time',
          submittedAt: null,
          onPaper: false,
          answers: {},
          checks: {},
        },
      },
    }),
  );
});
test('paper sets have different problems and no official-duration or auto-grade claims', () => {
  const a = paperProblems('a'),
    b = paperProblems('b');
  assert.equal(a.length, 8);
  assert.equal(b.length, 8);
  assert.notDeepEqual(a, b);
  assert.notEqual(
    a.find((p) => p.id === 'test-suite')!.prompt,
    b.find((p) => p.id === 'test-suite')!.prompt,
  );
  assert.notEqual(a.find((p) => p.id === 'moves')!.code, b.find((p) => p.id === 'moves')!.code);
  for (const p of [...a, ...b]) assert.ok(p.solution && p.rubric.length >= 3);
});
test('Toronto study dates respect the local day near midnight', () => {
  assert.equal(torontoDay(new Date('2026-11-10T03:30:00Z')), '2026-11-09');
});
test('additive course content preserves the v0.4 core question material exactly', () => {
  const fixture = JSON.parse(readFileSync('tests/fixtures/core-bank-hashes.json', 'utf8')) as {
    id: string;
    seed: number;
    sha: string;
  }[];
  for (const f of fixture)
    assert.equal(
      createHash('sha256')
        .update(questionMaterial(makeQuestion(f.id, f.seed)))
        .digest('hex'),
      f.sha,
      f.id,
    );
  assert.equal(
    assessmentRefs(42)
      .map((r) => makeQuestion(r.id, r.seed))
      .some((q) => q.topic === 'cscb07'),
    false,
  );
});
