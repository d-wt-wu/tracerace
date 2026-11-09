import type { Challenge } from './starter';

export type QuestionRandom = {
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
};
export type QuestionBody = Pick<
  Challenge,
  'code' | 'prompt' | 'expected' | 'explanation' | 'hint'
> &
  Partial<Pick<Challenge, 'faultExpected' | 'data'>> & { wrong: string[] };
export type QuestionFamily = Pick<
  Challenge,
  'id' | 'unit' | 'topic' | 'difficulty' | 'title' | 'mode' | 'language'
> & { build: (random: QuestionRandom) => QuestionBody };
