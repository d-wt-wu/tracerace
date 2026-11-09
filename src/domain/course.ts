import { CSCB07_LESSONS, COURSE_EXAM_DAY } from '../content/cscb07/lessons';
import { freshVariant } from '../content/bank';
import { WRITTEN_TASKS } from '../content/cscb07/written';

export type CourseSession = {
  seed: number;
  family: string;
  index: number;
  mode: 'learn' | 'review';
  answer: string;
  checked: boolean;
  wrong: boolean;
  hinted: boolean;
};
export type ConceptProgress = {
  readAt: string | null;
  completedAt: string | null;
  attempts: number;
  incorrect: number;
  hints: number;
  supported: number;
  independent: number;
  delayed: number;
  independentVariants: string[];
  firstIndependentAt: string | null;
  lastDelayedAt: string | null;
  lastAttemptAt: string | null;
  lastCorrect: boolean | null;
  nextReviewAt: string | null;
  misconceptions: string[];
  session: CourseSession | null;
};
export type CourseAttempt = {
  lesson: string;
  question: string;
  variant: string;
  at: string;
  correct: boolean;
  assisted: boolean;
  review: boolean;
};
export type WrittenReview = {
  answer: string;
  onPaper?: boolean;
  previousAnswer?: string;
  scaffold: 'worked' | 'gaps' | 'blank';
  submittedAt: string | null;
  checks: boolean[];
  rating: 'unreviewed' | 'needs-work' | 'supported' | 'self-independent';
};
export type PaperRun = {
  minutes: number;
  startedAt: string;
  submittedAt: string | null;
  onPaper: boolean;
  answers: Record<string, string>;
  checks: Record<string, boolean[]>;
};
export type CourseProgress = {
  version: 1;
  startedDay: string | null;
  budget: number;
  concepts: Record<string, ConceptProgress>;
  attempts: CourseAttempt[];
  written: Record<string, WrittenReview>;
  papers: Record<string, PaperRun>;
};
export const freshCourse = (): CourseProgress => ({
  version: 1,
  startedDay: null,
  budget: 180,
  concepts: {},
  attempts: [],
  written: {},
  papers: {},
});
export const freshConcept = (): ConceptProgress => ({
  readAt: null,
  completedAt: null,
  attempts: 0,
  incorrect: 0,
  hints: 0,
  supported: 0,
  independent: 0,
  delayed: 0,
  independentVariants: [],
  firstIndependentAt: null,
  lastDelayedAt: null,
  lastAttemptAt: null,
  lastCorrect: null,
  nextReviewAt: null,
  misconceptions: [],
  session: null,
});
export const conceptProgress = (p: CourseProgress, id: string) => p.concepts[id] ?? freshConcept();
export function torontoDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map((t) => parts.find((p) => p.type === t)!.value).join('-');
}
const dayDistance = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
const after = (now: Date, minutes: number) =>
  new Date(now.getTime() + minutes * 60000).toISOString();
export function updateConcept(
  p: CourseProgress,
  id: string,
  update: (c: ConceptProgress) => ConceptProgress,
): CourseProgress {
  if (!CSCB07_LESSONS.some((l) => l.id === id)) throw new Error('Unknown course lesson');
  return { ...p, concepts: { ...p.concepts, [id]: update(conceptProgress(p, id)) } };
}
export function beginCourseSession(
  p: CourseProgress,
  id: string,
  mode: 'learn' | 'review',
  seed: number,
): CourseProgress {
  const l = CSCB07_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error('Unknown course lesson');
  if (!conceptProgress(p, id).readAt) throw new Error('Read the worked example first');
  if (mode === 'learn' && l.prerequisites.some((pre) => !conceptProgress(p, pre).completedAt))
    throw new Error('Finish the prerequisite first');
  const c = conceptProgress(p, id);
  if (mode === 'review' && !c.completedAt)
    throw new Error('Finish the teaching sequence before retrieval mode');
  const family =
    mode === 'review' && c.misconceptions.length
      ? c.misconceptions.at(-1)!
      : l.families[mode === 'review' ? seed % l.families.length : 0];
  const q = freshVariant(
    family,
    seed >>> 0,
    p.attempts.map((a) => a.variant),
  );
  return updateConcept(p, id, (old) => ({
    ...old,
    session: {
      seed: q.seed,
      family,
      index: 0,
      mode,
      answer: '',
      checked: false,
      wrong: false,
      hinted: false,
    },
  }));
}
export function logCourseHint(p: CourseProgress, id: string): CourseProgress {
  return updateConcept(p, id, (c) =>
    !c.session || c.session.hinted
      ? c
      : {
          ...c,
          hints: c.hints + 1,
          independentVariants: [],
          firstIndependentAt: null,
          session: { ...c.session, hinted: true },
        },
  );
}
export function recordCourseAnswer(
  p: CourseProgress,
  id: string,
  question: string,
  variant: string,
  correct: boolean,
  now = new Date(),
): CourseProgress {
  const c = conceptProgress(p, id),
    session = c.session;
  if (!session || session.checked) return p;
  const assisted =
    session.hinted || session.wrong || (session.mode === 'learn' && session.index < 2);
  const fresh = !c.independentVariants.includes(variant);
  const independent = correct && !assisted && fresh;
  const delayed =
    independent &&
    !!c.firstIndependentAt &&
    (now.getTime() - Date.parse(c.firstIndependentAt) >= 4 * 60 * 60 * 1000 ||
      torontoDay(now) !== torontoDay(new Date(c.firstIndependentAt)));
  let next = updateConcept(p, id, (old) => ({
    ...old,
    attempts: old.attempts + 1,
    incorrect: old.incorrect + Number(!correct),
    supported: old.supported + Number(correct && assisted),
    independent: old.independent + Number(independent),
    delayed: old.delayed + Number(delayed),
    independentVariants: !correct
      ? []
      : independent
        ? [...old.independentVariants, variant].slice(-8)
        : old.independentVariants,
    firstIndependentAt: !correct
      ? null
      : (old.firstIndependentAt ?? (independent ? now.toISOString() : null)),
    lastDelayedAt: delayed ? now.toISOString() : old.lastDelayedAt,
    lastAttemptAt: now.toISOString(),
    lastCorrect: correct,
    nextReviewAt: after(
      now,
      !correct || assisted ? 20 : !old.delayed && old.incorrect ? 240 : 24 * 60,
    ),
    misconceptions: correct
      ? old.misconceptions
      : [...new Set([...old.misconceptions, question])].slice(-8),
    session: { ...session, checked: correct, wrong: !correct },
  }));
  next = {
    ...next,
    attempts: [
      ...p.attempts,
      {
        lesson: id,
        question,
        variant,
        at: now.toISOString(),
        correct,
        assisted,
        review: session.mode === 'review',
      },
    ].slice(-128),
  };
  return next;
}
export function advanceCourseQuestion(
  p: CourseProgress,
  id: string,
  repair = false,
): CourseProgress {
  return updateConcept(p, id, (c) => {
    if (!c.session) return c;
    if (!repair && !c.session.checked) throw new Error('Check the answer before continuing');
    const l = CSCB07_LESSONS.find((x) => x.id === id)!;
    const index = repair ? c.session.index : c.session.index + 1;
    const family = repair
      ? c.session.family
      : l.families[
          (index + (c.session.mode === 'review' ? c.session.seed : 0)) % l.families.length
        ];
    const q = freshVariant(
      family,
      (c.session.seed + 104729) >>> 0,
      p.attempts.map((a) => a.variant),
    );
    return {
      ...c,
      session: {
        ...c.session,
        family,
        seed: q.seed,
        index,
        answer: '',
        checked: false,
        wrong: false,
        hinted: false,
      },
    };
  });
}
export function finishCourseSession(
  p: CourseProgress,
  id: string,
  now = new Date(),
): CourseProgress {
  return updateConcept(p, id, (c) => {
    if (!c.session || c.session.index < (c.session.mode === 'learn' ? 4 : 2))
      throw new Error('Finish the practice sequence first');
    if (c.session.mode === 'learn' && c.independent < 1)
      throw new Error('An independent checked answer is still needed');
    if (c.session.mode === 'review' && !c.completedAt)
      throw new Error('This lesson has not been practiced yet');
    return { ...c, completedAt: c.completedAt ?? now.toISOString(), session: null };
  });
}
export function conceptStatus(c: ConceptProgress): 'new' | 'learning' | 'practicing' | 'secure' {
  if (
    c.independentVariants.length >= 2 &&
    c.firstIndependentAt &&
    c.lastDelayedAt &&
    Date.parse(c.lastDelayedAt) >= Date.parse(c.firstIndependentAt) &&
    c.lastCorrect
  )
    return 'secure';
  return c.completedAt || c.independent ? 'practicing' : c.readAt ? 'learning' : 'new';
}
export const readyForLesson = (p: CourseProgress, id: string) =>
  CSCB07_LESSONS.find((l) => l.id === id)?.prerequisites.every(
    (pre) => !!conceptProgress(p, pre).completedAt,
  ) ?? false;
export function coursePlan(p: CourseProgress, now = new Date()) {
  const today = [torontoDay(now), '2026-11-09'].sort().at(-1)!,
    start = p.startedDay ?? today;
  const daysAtStart = Math.max(1, dayDistance(start, COURSE_EXAM_DAY));
  const day = Math.max(0, dayDistance(start, today));
  const isWarmup = today >= COURSE_EXAM_DAY;
  const target =
    start === '2026-11-09'
      ? [7, 14, 21, 24][Math.min(day, 3)]
      : Math.min(24, Math.ceil((24 * (day + 1)) / daysAtStart));
  const remaining = CSCB07_LESSONS.filter((l) => !conceptProgress(p, l.id).completedAt);
  const due = CSCB07_LESSONS.filter((l) => {
    const c = conceptProgress(p, l.id);
    return !!c.nextReviewAt && Date.parse(c.nextReviewAt) <= now.getTime();
  });
  const newLessons = isWarmup
    ? []
    : CSCB07_LESSONS.slice(0, target).filter((l) => !conceptProgress(p, l.id).completedAt);
  const studyDaysLeft = Math.max(0, dayDistance(today, COURSE_EXAM_DAY));
  const remainingWritten = WRITTEN_TASKS.filter((t) => !p.written[t.id]?.submittedAt);
  const plannedWritten = [
    ['trace-parameters', 'repair-memory'],
    ['construction', 'module-files', 'test-suite'],
    ['deep-copy', 'assignment', 'moves'],
    ['list-interface', 'iterator', 'transfer-count', 'transfer-clamp'],
  ]
    .slice(0, Math.min(day + 1, 4))
    .flat();
  const writtenToday = isWarmup
    ? []
    : remainingWritten.filter((t) => plannedWritten.includes(t.id));
  const estimate =
    remaining.length * 10 +
    remainingWritten.reduce((n, t) => n + t.minutes, 0) +
    studyDaysLeft * 25 +
    (p.papers.a?.submittedAt ? 0 : 90);
  const available = studyDaysLeft * p.budget;
  return {
    today,
    start,
    due,
    newLessons,
    remaining,
    writtenToday,
    estimatedToday:
      newLessons.length * 10 +
      writtenToday.reduce((n, t) => n + t.minutes, 0) +
      Math.max(20, due.length * 4) +
      25,
    isWarmup,
    studyDaysLeft,
    estimate,
    extraMinutes: Math.max(0, estimate - available),
    suggestedMinutes: isWarmup ? 20 : p.budget,
    paperSuggested: !isWarmup && (today >= '2026-11-12' || remaining.length === 0),
  };
}

const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const integer = (x: unknown, min = 0, max = 1000000): x is number =>
  Number.isInteger(x) && Number(x) >= min && Number(x) <= max;
const stamp = (x: unknown) =>
  x === null || (typeof x === 'string' && x.length <= 40 && !Number.isNaN(Date.parse(x)));
const dayValid = (x: unknown) =>
  x === null ||
  (typeof x === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x) &&
    new Date(x + 'T12:00:00Z').toISOString().slice(0, 10) === x);
const text = (x: unknown, max = 4000): x is string => typeof x === 'string' && x.length <= max;
const bools = (x: unknown): x is boolean[] =>
  Array.isArray(x) && x.length <= 12 && x.every((v) => typeof v === 'boolean');
export function decodeCourse(value: unknown): CourseProgress {
  if (value === undefined) return freshCourse();
  if (
    !obj(value) ||
    value.version !== 1 ||
    !dayValid(value.startedDay) ||
    !integer(value.budget, 30, 480) ||
    !obj(value.concepts) ||
    !Array.isArray(value.attempts) ||
    value.attempts.length > 128 ||
    !obj(value.written) ||
    !obj(value.papers)
  )
    throw new Error('Invalid course progress');
  const ids = new Set(CSCB07_LESSONS.map((l) => l.id));
  const p = freshCourse();
  p.startedDay = value.startedDay as string | null;
  p.budget = value.budget;
  for (const [id, raw] of Object.entries(value.concepts)) {
    if (!ids.has(id) || !obj(raw)) throw new Error('Invalid course concept');
    const c = { ...freshConcept(), ...raw } as ConceptProgress;
    if (
      ![
        c.readAt,
        c.completedAt,
        c.firstIndependentAt,
        c.lastDelayedAt,
        c.lastAttemptAt,
        c.nextReviewAt,
      ].every(stamp) ||
      ![c.attempts, c.incorrect, c.hints, c.supported, c.independent, c.delayed].every((v) =>
        integer(v),
      ) ||
      c.incorrect > c.attempts ||
      (c.lastCorrect !== null && typeof c.lastCorrect !== 'boolean') ||
      !Array.isArray(c.independentVariants) ||
      c.independentVariants.length > 8 ||
      !c.independentVariants.every((s) => text(s, 160)) ||
      !Array.isArray(c.misconceptions) ||
      c.misconceptions.length > 8 ||
      !c.misconceptions.every((s) => text(s, 120) && s.startsWith('b07-'))
    )
      throw new Error('Invalid concept counters');
    if (
      c.session &&
      (!obj(c.session) ||
        !integer(c.session.seed, 0, 0xffffffff) ||
        !text(c.session.family, 120) ||
        !CSCB07_LESSONS.find((l) => l.id === id)!.families.includes(c.session.family) ||
        !integer(c.session.index, 0, 4) ||
        !['learn', 'review'].includes(c.session.mode) ||
        !text(c.session.answer, 1000) ||
        ![c.session.checked, c.session.wrong, c.session.hinted].every(
          (v) => typeof v === 'boolean',
        ))
    )
      throw new Error('Invalid course session');
    p.concepts[id] = c;
  }
  for (const a of value.attempts) {
    if (
      !obj(a) ||
      !ids.has(String(a.lesson)) ||
      !text(a.question, 120) ||
      !a.question.startsWith('b07-') ||
      !text(a.variant, 160) ||
      !stamp(a.at) ||
      !a.at ||
      ![a.correct, a.assisted, a.review].every((v) => typeof v === 'boolean')
    )
      throw new Error('Invalid course attempt');
    p.attempts.push(a as unknown as CourseAttempt);
  }
  const writtenIds = new Set([
    'trace-parameters',
    'repair-memory',
    'construction',
    'module-files',
    'test-suite',
    'deep-copy',
    'assignment',
    'moves',
    'list-interface',
    'iterator',
    'transfer-count',
    'transfer-clamp',
  ]);
  for (const [id, w] of Object.entries(value.written)) {
    if (
      !writtenIds.has(id) ||
      !obj(w) ||
      !text(w.answer) ||
      (w.previousAnswer !== undefined && !text(w.previousAnswer)) ||
      (w.onPaper !== undefined && typeof w.onPaper !== 'boolean') ||
      !['worked', 'gaps', 'blank'].includes(String(w.scaffold)) ||
      !stamp(w.submittedAt) ||
      !bools(w.checks) ||
      !['unreviewed', 'needs-work', 'supported', 'self-independent'].includes(String(w.rating))
    )
      throw new Error('Invalid written practice');
    p.written[id] = w as unknown as WrittenReview;
  }
  for (const [id, run] of Object.entries(value.papers)) {
    if (
      !['a', 'b'].includes(id) ||
      !obj(run) ||
      !integer(run.minutes, 5, 240) ||
      !stamp(run.startedAt) ||
      !run.startedAt ||
      !stamp(run.submittedAt) ||
      typeof run.onPaper !== 'boolean' ||
      !obj(run.answers) ||
      !obj(run.checks) ||
      Object.keys(run.answers).length > 12 ||
      Object.keys(run.checks).length > 12
    )
      throw new Error('Invalid paper session');
    for (const [key, a] of Object.entries(run.answers))
      if (!/^[a-z0-9-]{1,50}$/.test(key) || !text(a)) throw new Error('Invalid paper response');
    for (const a of Object.values(run.checks))
      if (!bools(a)) throw new Error('Invalid paper review');
    p.papers[id] = run as unknown as PaperRun;
  }
  return p;
}
