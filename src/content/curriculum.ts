import { traceAnswer, traceProgram } from '../engine/c';
import { BASE_UNITS, type UnitId } from './starter';
import { FAMILIES, makeQuestion } from './bank';
import { CSCB07_UNITS } from './cscb07';
export type { Challenge, Difficulty, Topic, UnitId } from './starter';
export { TOPICS, FAMILIES, BANK_VERSION } from './bank';
export const UNITS: {
  id: UnitId;
  number: string;
  title: string;
  subtitle: string;
  color: string;
  soft: string;
  icon: 'cube-outline' | 'grid-outline' | 'git-branch-outline' | 'layers-outline';
}[] = [
  ...BASE_UNITS,
  {
    id: 'algorithms',
    number: '05',
    title: 'Pick a better plan',
    subtitle: 'Searches, windows, and shortest paths.',
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'git-branch-outline',
  },
  {
    id: 'structures',
    number: '06',
    title: 'Give data a home',
    subtitle: 'Stacks, queues, sets, and heaps.',
    color: '#2476A0',
    soft: '#E6F1F7',
    icon: 'layers-outline',
  },
  {
    id: 'complexity',
    number: '07',
    title: 'Think a little bigger',
    subtitle: 'Find the work that grows.',
    color: '#B2712E',
    soft: '#FFF0DB',
    icon: 'grid-outline',
  },
  {
    id: 'sql',
    number: '08',
    title: 'Ask the data',
    subtitle: 'Filters, NULLs, joins, and rollback.',
    color: '#A24D77',
    soft: '#F8E7F0',
    icon: 'grid-outline',
  },
  {
    id: 'systems',
    number: '09',
    title: 'Under the surface',
    subtitle: 'Bits, caches, concurrency, and I/O.',
    color: '#C26E42',
    soft: '#FBEBDF',
    icon: 'cube-outline',
  },
];
UNITS.push(...CSCB07_UNITS);
export const CHALLENGES = FAMILIES.map((f) => makeQuestion(f.id, 0));
export const challengesFor = (unit: string) => CHALLENGES.filter((c) => c.unit === unit);
export const correctChoice = (challenge: import('./starter').Challenge) => {
  const expected =
    challenge.mode === 'trace' ? traceAnswer(traceProgram(challenge.code)) : challenge.expected;
  const choice = challenge.choices.find((c) => c.value === expected);
  if (!choice) throw new Error('No matching choice for ' + challenge.id);
  return choice;
};
