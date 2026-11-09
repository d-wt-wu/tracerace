import type { FaultKind } from '../engine/c';

export type UnitId =
  | 'values'
  | 'arrays'
  | 'pointers'
  | 'heap'
  | 'algorithms'
  | 'structures'
  | 'complexity'
  | 'sql'
  | 'systems'
  | 'b07-1'
  | 'b07-2'
  | 'b07-3'
  | 'b07-4'
  | 'b07-5'
  | 'b07-6';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Topic = 'c' | 'algorithms' | 'structures' | 'complexity' | 'sql' | 'systems' | 'cscb07';
export type Choice = { value: string; label: string };
export type Challenge = {
  id: string;
  seed: number;
  variantId: string;
  difficulty: Difficulty;
  topic: Topic;
  mode: 'trace' | 'reasoning';
  language: 'C' | 'C++' | 'SQL' | 'pseudocode' | 'scenario';
  data?: Record<string, unknown>;
  rankTicket?: string;
  unit: UnitId;
  title: string;
  prompt: string;
  code: string;
  choices: Choice[];
  explanation: string;
  hint: string;
  expected: string;
  faultExpected?: FaultKind;
};
export const BASE_UNITS: {
  id: UnitId;
  number: string;
  title: string;
  subtitle: string;
  color: string;
  soft: string;
  icon: 'cube-outline' | 'grid-outline' | 'git-branch-outline' | 'layers-outline';
}[] = [
  {
    id: 'values',
    number: '01',
    title: 'Follow the value',
    subtitle: 'Small programs. A good place to start.',
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'cube-outline',
  },
  {
    id: 'arrays',
    number: '02',
    title: 'Find your place',
    subtitle: 'Arrays, indexes, and the edges.',
    color: '#2476A0',
    soft: '#E6F1F7',
    icon: 'grid-outline',
  },
  {
    id: 'pointers',
    number: '03',
    title: 'Make the connection',
    subtitle: 'Addresses finally start making sense.',
    color: '#C26E42',
    soft: '#FBEBDF',
    icon: 'git-branch-outline',
  },
  {
    id: 'heap',
    number: '04',
    title: 'A little more space',
    subtitle: 'Allocate it. Use it. Let it go.',
    color: '#A24D77',
    soft: '#F8E7F0',
    icon: 'layers-outline',
  },
];
const outputs = (...values: (number | string)[]): Choice[] =>
  values.map((v) => ({ value: String(v), label: String(v) }));
const fault = (kind: FaultKind, label: string): Choice => ({ value: 'fault:' + kind, label });
export const STARTER_CHALLENGES: Omit<
  Challenge,
  'seed' | 'variantId' | 'difficulty' | 'topic' | 'mode' | 'language'
>[] = [
  {
    id: 'warm-up',
    unit: 'values',
    title: 'A small warm-up',
    prompt: 'What gets printed?',
    code: 'int score = 4;\nscore = score + 3;\nprintf("%d", score);',
    choices: outputs(4, 7, 3, 12),
    expected: '7',
    explanation:
      'score starts at 4. The assignment adds 3 and stores 7 back in score. printf reads that new value.',
    hint: 'An assignment replaces the value in the box on the left.',
  },
  {
    id: 'copy-not-link',
    unit: 'values',
    title: 'A copy, not a connection',
    prompt: 'What is the final printed value of b?',
    code: 'int a = 5;\nint b = a;\na = 9;\nprintf("%d", b);',
    choices: outputs(9, 14, 5, 0),
    expected: '5',
    explanation:
      'b receives a copy of 5. Changing a later does not change b. These are two separate int boxes.',
    hint: 'The second line copies a value; it does not create a pointer.',
  },
  {
    id: 'order-matters',
    unit: 'values',
    title: 'Order matters',
    prompt: 'Which number gets printed?',
    code: 'int n = 2;\nn = n + 3 * 2;\nprintf("%d", n);',
    choices: outputs(10, 8, 12, 6),
    expected: '8',
    explanation: 'Multiplication happens first: 3 * 2 is 6. Adding the original 2 gives 8.',
    hint: 'Work out the multiplication before the addition.',
  },
  {
    id: 'integer-slice',
    unit: 'values',
    title: 'Keep the whole part',
    prompt: 'What does this integer division print?',
    code: 'int slices = 11;\nint friends = 3;\nint each = slices / friends;\nprintf("%d", each);',
    choices: outputs('3.67', 4, 3, 2),
    expected: '3',
    explanation:
      'Both operands are ints, so C uses integer division. 11 / 3 produces 3; the fractional part is discarded.',
    hint: 'An int cannot store the fractional part of this result.',
  },
  {
    id: 'start-at-zero',
    unit: 'arrays',
    title: 'Start at zero',
    prompt: 'Which value lives at index 1?',
    code: 'int steps[3] = {4, 7, 9};\nprintf("%d", steps[1]);',
    choices: outputs(4, 7, 9, 1),
    expected: '7',
    explanation:
      'Index 0 contains 4, index 1 contains 7, and index 2 contains 9. An index counts offsets from the beginning.',
    hint: 'The first slot is numbered 0.',
  },
  {
    id: 'change-one-slot',
    unit: 'arrays',
    title: 'One slot changes',
    prompt: 'What gets printed after the update?',
    code: 'int a[3] = {2, 4, 6};\na[1] = a[0] + 5;\nprintf("%d", a[1]);',
    choices: outputs(4, 9, 7, 11),
    expected: '7',
    explanation: 'a[0] is 2. Adding 5 stores 7 in a[1]; the other slots stay unchanged.',
    hint: 'Only the slot on the left side of the assignment gets replaced.',
  },
  {
    id: 'index-is-a-value',
    unit: 'arrays',
    title: 'An index can be a value',
    prompt: 'Which array element gets printed?',
    code: 'int a[3] = {10, 20, 30};\nint i = 0;\ni += 2;\nprintf("%d", a[i]);',
    choices: outputs(10, 20, 30, 2),
    expected: '30',
    explanation: 'i becomes 2. The expression a[i] therefore reads a[2], which is 30.',
    hint: 'Update i first, then use its value as the index.',
  },
  {
    id: 'past-the-edge',
    unit: 'arrays',
    title: 'Past the edge',
    prompt: 'What happens when this array is read?',
    code: 'int a[3] = {2, 4, 6};\nprintf("%d", a[3]);',
    choices: [...outputs(6, 0, 3), fault('out-of-bounds', 'Undefined behavior')],
    expected: 'fault:out-of-bounds',
    faultExpected: 'out-of-bounds',
    explanation:
      'A three-element array has valid indexes 0, 1 and 2. Reading a[3] is out of bounds. Real C does not promise a particular output.',
    hint: 'Count the valid indexes, not just the number of elements.',
  },
  {
    id: 'point-to-a-box',
    unit: 'pointers',
    title: 'Point to a box',
    prompt: 'What value is reached through p?',
    code: 'int x = 6;\nint *p = &x;\nprintf("%d", *p);',
    choices: outputs(0, 6, 1, '&x'),
    expected: '6',
    explanation:
      '&x gives the address of x. p keeps that address. Reading *p follows it back to the value 6.',
    hint: '& takes an address. * follows a pointer.',
  },
  {
    id: 'write-through',
    unit: 'pointers',
    title: 'Write through the pointer',
    prompt: 'What does x contain now?',
    code: 'int x = 6;\nint *p = &x;\n*p = 12;\nprintf("%d", x);',
    choices: outputs(6, 18, 0, 12),
    expected: '12',
    explanation:
      'p points to x, so assigning 12 to *p writes directly into x. A pointer lets us access the same box another way.',
    hint: '*p is the box p points to, not a separate copy.',
  },
  {
    id: 'one-step-forward',
    unit: 'pointers',
    title: 'One element forward',
    prompt: 'Which value does the moved pointer read?',
    code: 'int a[3] = {3, 6, 9};\nint *p = a;\np = p + 1;\nprintf("%d", *p);',
    choices: outputs(3, 4, 6, 9),
    expected: '6',
    explanation:
      'Adding 1 to an int pointer moves it by one int element. p moves from a[0] to a[1], which holds 6.',
    hint: 'Pointer arithmetic counts elements, not single bytes.',
  },
  {
    id: 'nowhere-to-go',
    unit: 'pointers',
    title: 'Nowhere to go',
    prompt: 'Is this a predictable read?',
    code: 'int *p = NULL;\nprintf("%d", *p);',
    choices: [
      ...outputs(0, 1),
      fault('null-pointer', 'Undefined behavior'),
      { value: 'address', label: 'Prints an address' },
    ],
    expected: 'fault:null-pointer',
    faultExpected: 'null-pointer',
    explanation:
      'NULL points to no int object. Dereferencing it is undefined behavior, not a guaranteed zero or a guaranteed crash.',
    hint: 'A null pointer is not an int box containing 0.',
  },
  {
    id: 'make-some-space',
    unit: 'heap',
    title: 'Make some space',
    prompt: 'What value comes back from the heap?',
    code: 'int *p = malloc(2 * sizeof(int));\np[0] = 8;\np[1] = 13;\nprintf("%d", p[1]);\nfree(p);',
    choices: outputs(8, 13, 2, 21),
    expected: '13',
    explanation:
      'The allocation has room for two ints. p[1] stores 13. It is read before the allocation is released. These lessons assume malloc succeeds.',
    hint: 'Track what is written into slot 1 before free runs.',
  },
  {
    id: 'released-is-released',
    unit: 'heap',
    title: 'Released means released',
    prompt: 'What happens at the final line?',
    code: 'int *p = malloc(sizeof(int));\n*p = 8;\nfree(p);\nprintf("%d", *p);',
    choices: [
      ...outputs(8, 0),
      fault('use-after-free', 'Undefined behavior'),
      { value: 'new', label: 'Allocates a new int' },
    ],
    expected: 'fault:use-after-free',
    faultExpected: 'use-after-free',
    explanation:
      'free releases the allocation. p still stores the old address, but that address no longer gives you a valid int to read.',
    hint: 'An address can remain in a pointer after the storage is freed.',
  },
  {
    id: 'same-allocation',
    unit: 'heap',
    title: 'Two ways to reach it',
    prompt: 'What gets printed through p?',
    code: 'int *p = malloc(2 * sizeof(int));\np[0] = 5;\np[1] = 9;\nint *q = p + 1;\n*q = 14;\nprintf("%d", p[1]);\nfree(p);',
    choices: outputs(5, 9, 14, 23),
    expected: '14',
    explanation:
      'q points to the second int in the same allocation as p. Writing 14 through q updates p[1]. There is one allocation and two pointers into it.',
    hint: 'Moving a pointer does not copy the allocation.',
  },
];
