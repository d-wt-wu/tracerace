import {
  FAMILIES,
  Random,
  TOPICS,
  makeQuestion,
  type QuestionRef,
  BANK_VERSION,
} from '../content/bank';
import type { Topic, Difficulty } from '../content/curriculum';
export type TopicScore = {
  topic: Topic;
  correct: number;
  total: number;
  earned: number;
  max: number;
};
export type AssessmentResult = {
  id: string;
  date: string;
  score: number;
  correct: number;
  total: number;
  earned: number;
  max: number;
  topics: TopicScore[];
  ranked: boolean;
  refs: QuestionRef[];
  answers: string[];
};
export type AssessmentDraft = {
  id: string;
  startedAt: string;
  bankVersion: number;
  refs: QuestionRef[];
  answers: (string | null)[];
  remoteId?: string;
};
export const WEIGHTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export function assessmentRefs(seed: number): QuestionRef[] {
  const random = new Random(seed),
    refs: QuestionRef[] = [];
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    for (const topic of random.shuffle(TOPICS)) {
      const candidates = FAMILIES.filter(
        (f) => f.topic === topic.id && f.difficulty === difficulty,
      );
      if (!candidates.length)
        throw new Error('Assessment coverage missing: ' + topic.id + '/' + difficulty);
      refs.push({ id: random.pick(candidates).id, seed: random.int(0, 0xffffffff) });
    }
  }
  return refs;
}
export function newDraft(seed: number, now = new Date()): AssessmentDraft {
  return {
    id: 'assessment-' + now.getTime().toString(36) + '-' + seed.toString(36),
    startedAt: now.toISOString(),
    bankVersion: BANK_VERSION,
    refs: assessmentRefs(seed),
    answers: Array(18).fill(null),
  };
}
export function gradeAssessment(
  refs: QuestionRef[],
  answers: string[],
  id: string,
  date = new Date().toISOString(),
  ranked = false,
): AssessmentResult {
  if (refs.length !== 18 || answers.length !== refs.length)
    throw new Error('Complete all 18 questions first');
  const coverage = refs.map((ref) => {
    const q = makeQuestion(ref.id, ref.seed);
    return q.topic + ':' + q.difficulty;
  });
  if (new Set(coverage).size !== 18)
    throw new Error('Assessment must cover each topic and difficulty exactly once');
  const topics = TOPICS.map((t) => ({ topic: t.id, correct: 0, total: 0, earned: 0, max: 0 }));
  let correct = 0,
    earned = 0,
    max = 0;
  refs.forEach((ref, i) => {
    const question = makeQuestion(ref.id, ref.seed);
    if (answers[i] !== '__skip__' && !question.choices.some((c) => c.value === answers[i]))
      throw new Error('Invalid assessment answer');
    const weight = WEIGHTS[question.difficulty],
      right = answers[i] === question.expected;
    const topic = topics.find((t) => t.topic === question.topic)!;
    topic.total++;
    topic.max += weight;
    if (right) {
      correct++;
      earned += weight;
      topic.correct++;
      topic.earned += weight;
    }
    max += weight;
  });
  return {
    id,
    date,
    score: Math.round((earned / max) * 100),
    correct,
    total: refs.length,
    earned,
    max,
    topics,
    ranked,
    refs,
    answers,
  };
}
