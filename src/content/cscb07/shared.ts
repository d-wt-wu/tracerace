import type { QuestionBody, QuestionFamily, QuestionRandom } from '../question-types';
import type { Difficulty } from '../starter';

export type Builder = (r: QuestionRandom) => QuestionBody;
export type CppCheck = { kind: 'run'; output: string } | { kind: 'compile'; compiles: boolean };
export function family(
  lecture: 1 | 2 | 3 | 4 | 5 | 6,
  slug: string,
  difficulty: Difficulty,
  title: string,
  pages: string,
  build: Builder,
  language: 'C++' | 'scenario' = 'C++',
): QuestionFamily {
  return {
    id: 'b07-l' + lecture + '-' + slug,
    unit: ('b07-' + lecture) as QuestionFamily['unit'],
    topic: 'cscb07',
    mode: 'reasoning',
    language,
    difficulty,
    title,
    build: (r) => {
      const body = build(r);
      return {
        ...body,
        data: { ...body.data, course: { id: 'cscb07', lecture, pages, version: 1 } },
      };
    },
  };
}
export function question(
  code: string,
  prompt: string,
  expected: string,
  wrong: string[],
  explanation: string,
  hint: string,
): QuestionBody {
  return { code, prompt, expected, wrong, explanation, hint };
}
export function output(
  code: string,
  expected: number | string,
  explanation: string,
  hint: string,
  wrong?: string[],
): QuestionBody {
  const answer = String(expected);
  return {
    ...question(
      code,
      'What does this program print? Standard C++20 headers are available.',
      answer,
      wrong ?? [String(Number(expected) + 1), String(Number(expected) - 1), 'Compile-time error'],
      explanation,
      hint,
    ),
    data: { cpp: { kind: 'run', output: answer } satisfies CppCheck },
  };
}
export function compilation(
  code: string,
  compiles: boolean,
  explanation: string,
  hint: string,
): QuestionBody {
  const expected = compiles ? 'Compiles' : 'Compile-time error';
  return {
    ...question(
      code,
      'Is this complete program well-formed C++20? Standard headers are available.',
      expected,
      [
        'Compiles',
        'Compile-time error',
        'Undefined behavior after successful compilation',
        'A required runtime exception',
      ].filter((v) => v !== expected),
      explanation,
      hint,
    ),
    data: { cpp: { kind: 'compile', compiles } satisfies CppCheck },
  };
}
