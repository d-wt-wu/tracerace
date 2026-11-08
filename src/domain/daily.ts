import { CHALLENGES } from '../content/curriculum';
import { freshVariant, hash } from '../content/bank';
import { dateKey, type Progress } from '../state/progress';

export type DailyPick = { id: string; reason: 'review' | 'new' | 'practice' };
export function dailyPlan(progress: Progress, today = dateKey(), limit = 3): DailyPick[] {
  const count = Math.max(0, Math.min(8, Math.floor(limit)));
  if (!count) return [];
  const known = new Set(CHALLENGES.map((q) => q.id));
  const doneToday = new Set([
    ...(progress.days[today] ?? []),
    ...progress.rewards.filter((r) => r.day === today).map((r) => r.familyId),
  ]);
  const due = Object.entries(progress.skills)
    .filter(([id, skill]) => known.has(id) && skill.due <= today && !doneToday.has(id))
    .sort(
      (a, b) =>
        a[1].due.localeCompare(b[1].due) ||
        a[1].firstTry / a[1].solves - b[1].firstTry / b[1].solves ||
        a[0].localeCompare(b[0]),
    );
  const unseen = CHALLENGES.filter((q) => !progress.skills[q.id]);
  const picks: DailyPick[] = due
    .slice(0, unseen.length ? Math.max(0, count - 1) : count)
    .map(([id]) => ({ id, reason: 'review' }));
  for (const q of unseen) {
    if (picks.length >= count) break;
    picks.push({ id: q.id, reason: 'new' });
  }
  for (const [id] of due) {
    if (picks.length >= count) break;
    if (!picks.some((q) => q.id === id)) picks.push({ id, reason: 'review' });
  }
  // When reviews are not due, practice is explicitly a refresher, not another mastery step.
  for (const [id] of Object.entries(progress.skills).sort(
    (a, b) => a[1].lastReviewed.localeCompare(b[1].lastReviewed) || a[0].localeCompare(b[0]),
  )) {
    if (picks.length >= count) break;
    if (known.has(id) && !doneToday.has(id) && !picks.some((q) => q.id === id))
      picks.push({ id, reason: 'practice' });
  }
  return picks;
}

export function dailyQuestions(progress: Progress, today = dateKey()) {
  const recent = progress.rewards.slice(-80).map((r) => r.variantId);
  return dailyPlan(progress, today).map((pick) =>
    freshVariant(pick.id, hash('daily:' + today + ':' + pick.id), recent),
  );
}
