import { primer } from './primer';
import { lecture1 } from './lecture1';
import { lecture2 } from './lecture2';
import { lecture3 } from './lecture3';
import { lecture4 } from './lecture4';
import { lecture5 } from './lecture5';
import { lecture6 } from './lecture6';

export const CSCB07_FAMILIES = [
  ...primer,
  ...lecture1,
  ...lecture2,
  ...lecture3,
  ...lecture4,
  ...lecture5,
  ...lecture6,
];
export const CSCB07_UNITS = [
  {
    id: 'b07-1' as const,
    number: 'B1',
    title: 'C++ foundations',
    subtitle: 'Values, references, pointers, and parameters.',
  },
  {
    id: 'b07-2' as const,
    number: 'B2',
    title: 'Memory, methods & testing',
    subtitle: 'Lifetime, specifications, and objects.',
  },
  {
    id: 'b07-3' as const,
    number: 'B3',
    title: 'Building and constructing',
    subtitle: 'Modules, constructors, and initialization.',
  },
  {
    id: 'b07-4' as const,
    number: 'B4',
    title: 'Independent ownership',
    subtitle: 'Destruction, deep copies, and assignment.',
  },
  {
    id: 'b07-5' as const,
    number: 'B5',
    title: 'Moving and protecting',
    subtitle: 'Move semantics, invariants, and List.',
  },
  {
    id: 'b07-6' as const,
    number: 'B6',
    title: 'Iterators',
    subtitle: 'Positions, range loops, and traversal cost.',
  },
].map((u) => ({ ...u, color: '#6654D9', soft: '#EEEAFD', icon: 'layers-outline' as const }));
