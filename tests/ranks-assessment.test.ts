import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TOPICS, makeQuestion } from '../src/content/bank';
import { assessmentRefs, gradeAssessment, newDraft } from '../src/domain/assessment';
import {
  SKILL_RANKS,
  LEAGUES,
  skillRank,
  leagueRank,
  nextRank,
  weekKey,
} from '../src/domain/ranks';
test('every assessment balances all six topics and three difficulties', () => {
  for (let seed = 0; seed < 128; seed++) {
    const refs = assessmentRefs(seed),
      questions = refs.map((r) => makeQuestion(r.id, r.seed));
    assert.equal(refs.length, 18);
    assert.equal(new Set(questions.map((q) => q.topic + ':' + q.difficulty)).size, 18);
    for (const topic of TOPICS)
      assert.equal(questions.filter((q) => q.topic === topic.id).length, 3);
  }
});
test('assessment generation is reproducible and changes across attempts', () => {
  assert.deepEqual(assessmentRefs(2), assessmentRefs(2));
  assert.notDeepEqual(assessmentRefs(2), assessmentRefs(3));
  assert.equal(newDraft(1).answers.filter((a) => a === null).length, 18);
});
test('perfect and entirely skipped assessments reach the correct endpoints', () => {
  const refs = assessmentRefs(42),
    perfect = refs.map((r) => makeQuestion(r.id, r.seed).expected);
  const result = gradeAssessment(refs, perfect, 'test');
  assert.equal(result.score, 100);
  assert.equal(result.correct, 18);
  assert.equal(result.earned, 36);
  assert.equal(result.max, 36);
  assert.equal(skillRank(result.score).name, 'Compiler Whisperer');
  const skipped = gradeAssessment(refs, Array(18).fill('__skip__'), 'test');
  assert.equal(skipped.score, 0);
  assert.equal(skipped.correct, 0);
  assert.equal(skillRank(skipped.score).name, 'Baby Byte');
});
test('difficulty weights are applied transparently, separately from XP', () => {
  const refs = assessmentRefs(42);
  const answers = refs.map((r) => {
    const q = makeQuestion(r.id, r.seed);
    return q.difficulty === 'easy' ? q.expected : '__skip__';
  });
  const result = gradeAssessment(refs, answers, 'test');
  assert.equal(result.correct, 6);
  assert.equal(result.earned, 6);
  assert.equal(result.score, 17);
  assert.ok(result.topics.every((t) => t.max === 6 && t.total === 3 && t.earned === 1));
  assert.equal(result.ranked, false);
});
test('incomplete, invalid, or unbalanced assessments cannot produce a rank', () => {
  const refs = assessmentRefs(42);
  assert.throws(() => gradeAssessment(refs, ['x'], 'test'));
  assert.throws(() => gradeAssessment(refs, Array(18).fill('invented-choice'), 'test'));
  assert.throws(() => gradeAssessment(Array(18).fill(refs[0]), Array(18).fill('__skip__'), 'test'));
});
test('rank thresholds and next-rank boundaries work without inventing a percentile', () => {
  for (const rank of SKILL_RANKS) assert.equal(skillRank(rank.threshold).name, rank.name);
  for (const rank of LEAGUES) assert.equal(leagueRank(rank.threshold).name, rank.name);
  assert.equal(skillRank(59).name, 'Bug Wrangler');
  assert.equal(skillRank(60).name, 'Junior SWE Energy');
  assert.equal(leagueRank(39).name, 'Potato Division');
  assert.equal(leagueRank(40).name, 'Keyboard Gremlins');
  assert.equal(nextRank(SKILL_RANKS, 100), null);
  assert.equal(nextRank(LEAGUES, 0)?.threshold, 40);
});
test('weekly leagues reset at Monday midnight UTC, across years and time zones', () => {
  assert.equal(weekKey(new Date('2026-11-08T23:59:59Z')), '2026-11-02');
  assert.equal(weekKey(new Date('2026-11-09T00:00:00Z')), '2026-11-09');
  assert.equal(weekKey(new Date('2027-01-01T12:00:00Z')), '2026-12-28');
  assert.equal(weekKey(new Date('2026-11-08T20:00:00-05:00')), '2026-11-09');
});
