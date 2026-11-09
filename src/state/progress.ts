import { BANK_VERSION, makeQuestion, type QuestionRef } from '../content/bank';
import { decodeCourse, freshCourse, type CourseProgress } from '../domain/course';
import type { Challenge } from '../content/curriculum';
import type { AssessmentDraft, AssessmentResult } from '../domain/assessment';
export type Skill = {
  solves: number;
  firstTry: number;
  lastReviewed: string;
  due: string;
  stage: number;
  xp: number;
};
export type Reward = { variantId: string; familyId: string; day: string; xp: number };
export type Progress = {
  version: 2;
  skills: Record<string, Skill>;
  days: Record<string, string[]>;
  haptics: boolean;
  bonusXP: number;
  rewards: Reward[];
  assessmentDraft: AssessmentDraft | null;
  assessments: AssessmentResult[];
  cscb07: CourseProgress;
};
export const freshProgress = (): Progress => ({
  version: 2,
  skills: {},
  days: {},
  haptics: true,
  bonusXP: 0,
  rewards: [],
  assessmentDraft: null,
  assessments: [],
  cscb07: freshCourse(),
});
export const dateKey = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
export function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return dateKey(new Date(year, month - 1, date + amount, 12));
}
export const totalXP = (p: Progress) =>
  p.bonusXP + Object.values(p.skills).reduce((sum, s) => sum + s.xp, 0);
export const dayCount = (p: Progress, day = dateKey()) => {
  const variants = p.rewards.filter((r) => r.day === day).length;
  return Math.max(variants, p.days[day]?.length ?? 0);
};
export function recordSolve(
  progress: Progress,
  id: string,
  assisted: boolean,
  day = dateKey(),
): { progress: Progress; earned: number } {
  const old = progress.skills[id];
  if (progress.days[day]?.includes(id)) return { progress, earned: 0 };
  const earned = old ? 0 : assisted ? 10 : 20;
  const earlyRecall = !assisted && old && old.due > day;
  const stage = assisted ? 0 : earlyRecall ? old.stage : Math.min((old?.stage ?? -1) + 1, 3);
  const skill: Skill = {
    solves: (old?.solves ?? 0) + 1,
    firstTry: (old?.firstTry ?? 0) + Number(!assisted),
    lastReviewed: day,
    due: earlyRecall ? old.due : shiftDay(day, [1, 3, 7, 14][stage]),
    stage,
    xp: old?.xp ?? earned,
  };
  return {
    earned,
    progress: {
      ...progress,
      skills: { ...progress.skills, [id]: skill },
      days: { ...progress.days, [day]: [...(progress.days[day] ?? []), id] },
    },
  };
}
export function recordPractice(
  progress: Progress,
  question: Pick<Challenge, 'id' | 'variantId'>,
  assisted: boolean,
  day = dateKey(),
): { progress: Progress; earned: number } {
  if (progress.rewards.some((r) => r.variantId === question.variantId && r.day === day))
    return { progress, earned: 0 };
  const old = progress.skills[question.id];
  const base = recordSolve(progress, question.id, assisted, day);
  const earned = old ? (assisted ? 2 : 5) : base.earned;
  let next = base.progress;
  // New variants count as attempts, but independent repeats do not fast-forward the review interval.
  if (old && progress.days[day]?.includes(question.id)) {
    next = {
      ...next,
      skills: {
        ...next.skills,
        [question.id]: {
          ...old,
          solves: old.solves + 1,
          firstTry: old.firstTry + Number(!assisted),
          ...(assisted ? { stage: 0, due: shiftDay(day, 1) } : {}),
        },
      },
    };
  }
  return {
    earned,
    progress: {
      ...next,
      bonusXP: next.bonusXP + (old ? earned : 0),
      rewards: [
        ...next.rewards.filter((r) => r.day >= shiftDay(day, -35)),
        { familyId: question.id, variantId: question.variantId, day, xp: earned },
      ],
    },
  };
}
export function streak(progress: Progress, today = dateKey()): number {
  let day = progress.days[today]?.length ? today : shiftDay(today, -1),
    count = 0;
  while (progress.days[day]?.length) {
    count++;
    day = shiftDay(day, -1);
  }
  return count;
}
export const dueIds = (p: Progress, today = dateKey()) =>
  Object.entries(p.skills)
    .filter(([, value]) => value.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
const validDay = (x: unknown): x is string =>
  typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && shiftDay(x, 0) === x;
const validDate = (x: unknown): x is string =>
  typeof x === 'string' && Number.isFinite(Date.parse(x));
const integer = (x: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): x is number =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;
function validRefs(value: unknown, ids: readonly string[]): value is QuestionRef[] {
  return (
    Array.isArray(value) &&
    value.length === 18 &&
    value.every((ref) => ref && ids.includes(ref.id) && integer(ref.seed, 0, 0xffffffff))
  );
}
export function decodeProgress(raw: string | null, ids: readonly string[]): Progress {
  if (!raw) return freshProgress();
  const data: unknown = JSON.parse(raw);
  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    ![1, 2].includes(Number(data.version))
  )
    throw new Error('Unknown progress format');
  const p = data as Progress;
  if (
    !p.skills ||
    !p.days ||
    typeof p.skills !== 'object' ||
    typeof p.days !== 'object' ||
    Array.isArray(p.skills) ||
    Array.isArray(p.days)
  )
    throw new Error('Invalid progress');
  const clean = freshProgress();
  clean.haptics = p.haptics !== false;
  clean.cscb07 = decodeCourse(p.cscb07);
  for (const [id, s] of Object.entries(p.skills)) {
    if (!ids.includes(id)) continue;
    if (
      !s ||
      !validDay(s.lastReviewed) ||
      !validDay(s.due) ||
      ![0, 1, 2, 3].includes(s.stage) ||
      ![10, 20].includes(s.xp) ||
      !integer(s.solves, 1) ||
      !integer(s.firstTry, 0, s.solves)
    )
      throw new Error('Invalid saved skill');
    clean.skills[id] = {
      solves: s.solves,
      firstTry: s.firstTry,
      lastReviewed: s.lastReviewed,
      due: s.due,
      stage: s.stage,
      xp: s.xp,
    };
  }
  for (const [day, list] of Object.entries(p.days)) {
    if (!validDay(day) || !Array.isArray(list)) throw new Error('Invalid activity date');
    clean.days[day] = [
      ...new Set(list.filter((id) => typeof id === 'string' && Boolean(clean.skills[id]))),
    ];
  }
  if (data.version === 1) return clean; // Preserve the first release's XP, dates, and settings.
  if (
    !integer(p.bonusXP) ||
    !Array.isArray(p.rewards) ||
    p.rewards.length > 10000 ||
    !Array.isArray(p.assessments) ||
    p.assessments.length > 20
  )
    throw new Error('Invalid practice history');
  clean.bonusXP = p.bonusXP;
  for (const reward of p.rewards) {
    if (
      !reward ||
      !ids.includes(reward.familyId) ||
      typeof reward.variantId !== 'string' ||
      reward.variantId.length > 160 ||
      !validDay(reward.day) ||
      ![2, 5, 10, 20].includes(reward.xp)
    )
      throw new Error('Invalid practice reward');
    if (clean.rewards.some((r) => r.variantId === reward.variantId && r.day === reward.day))
      throw new Error('Duplicate practice reward');
    clean.rewards.push(reward);
  }
  if (p.assessmentDraft) {
    const d = p.assessmentDraft;
    if (
      typeof d.id !== 'string' ||
      !validDate(d.startedAt) ||
      d.bankVersion !== BANK_VERSION ||
      !validRefs(d.refs, ids) ||
      !Array.isArray(d.answers) ||
      d.answers.length !== 18 ||
      !d.answers.every(
        (a, i) =>
          a === null ||
          a === '__skip__' ||
          makeQuestion(d.refs[i].id, d.refs[i].seed).choices.some((c) => c.value === a),
      )
    )
      throw new Error('Invalid assessment draft');
    clean.assessmentDraft = d;
  }
  for (const result of p.assessments) {
    if (
      !result ||
      typeof result.id !== 'string' ||
      !validDate(result.date) ||
      !integer(result.score, 0, 100) ||
      !integer(result.correct, 0, 18) ||
      result.total !== 18 ||
      !integer(result.earned, 0, 36) ||
      result.max !== 36 ||
      result.score !== Math.round((result.earned / result.max) * 100) ||
      !validRefs(result.refs, ids) ||
      !Array.isArray(result.answers) ||
      result.answers.length !== 18 ||
      !result.answers.every((a) => typeof a === 'string') ||
      !Array.isArray(result.topics) ||
      result.topics.length !== 6 ||
      typeof result.ranked !== 'boolean'
    )
      throw new Error('Invalid assessment result');
    clean.assessments.push(result);
  }
  return clean;
}
