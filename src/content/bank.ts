import {
  STARTER_CHALLENGES,
  type Challenge,
  type Difficulty,
  type Topic,
  type UnitId,
} from './starter';
import { CSCB07_FAMILIES } from './cscb07';

export const BANK_VERSION = 2;
export const TOPICS: { id: Topic; title: string; short: string }[] = [
  { id: 'c', title: 'C & memory', short: 'C' },
  { id: 'algorithms', title: 'Algorithms', short: 'Algorithms' },
  { id: 'structures', title: 'Data structures', short: 'Structures' },
  { id: 'complexity', title: 'Time & space', short: 'Big O' },
  { id: 'sql', title: 'SQL & data', short: 'SQL' },
  { id: 'systems', title: 'Systems reasoning', short: 'Systems' },
];
export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
export class Random {
  constructor(private state: number) {
    this.state >>>= 0;
  }
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
type Body = Pick<Challenge, 'code' | 'prompt' | 'expected' | 'explanation' | 'hint'> &
  Partial<Pick<Challenge, 'faultExpected' | 'data'>>;
type Family = {
  id: string;
  unit: UnitId;
  topic: Topic;
  difficulty: Difficulty;
  title: string;
  mode: 'trace' | 'reasoning';
  language: Challenge['language'];
  build: (r: Random) => Body & { wrong: string[] };
};
const numbers = (answer: number, distractors: number[] = []) =>
  [...new Set([...distractors, answer + 1, answer - 1, answer + 2, 0, answer + 3])]
    .filter((n) => n !== answer)
    .slice(0, 3)
    .map(String);
const numeric = (
  expected: number,
  code: string,
  prompt: string,
  explanation: string,
  hint: string,
  data: Record<string, unknown> = {},
  distractors?: number[],
) => ({
  expected: String(expected),
  code,
  prompt,
  explanation,
  hint,
  data,
  wrong: numbers(expected, distractors),
});
const arr = (name: string, ns: number[]) =>
  'int ' + name + '[' + ns.length + '] = {' + ns.join(', ') + '};\n';
const print = (value: string) => 'printf("%d", ' + value + ');';
const difficultyById: Record<string, Difficulty> = {
  'warm-up': 'easy',
  'copy-not-link': 'easy',
  'order-matters': 'medium',
  'integer-slice': 'easy',
  'start-at-zero': 'easy',
  'change-one-slot': 'medium',
  'index-is-a-value': 'medium',
  'past-the-edge': 'hard',
  'point-to-a-box': 'easy',
  'write-through': 'medium',
  'one-step-forward': 'medium',
  'nowhere-to-go': 'hard',
  'make-some-space': 'medium',
  'released-is-released': 'hard',
  'same-allocation': 'hard',
};
function cBody(id: string, r: Random): Body & { wrong: string[] } {
  const a = r.int(2, 14),
    b = r.int(1, 9),
    c = r.int(3, 18);
  const name = r.pick(['score', 'count', 'steps']),
    array = r.pick(['a', 'scores', 'nums']);
  const ns = Array.from({ length: r.int(3, 5) }, () => r.int(1, 24));
  const base = STARTER_CHALLENGES.find((q) => q.id === id)!;
  const result = (
    code: string,
    explanation: string,
    extras: Partial<Body> & { expected: string },
  ) => {
    const expected = extras.expected;
    const wrong = expected.startsWith('fault:')
      ? [String(a), '0', String(c + 20)]
      : numbers(Number(expected), [a, b, c]);
    return { ...base, code, explanation, wrong, ...extras };
  };
  switch (id) {
    case 'warm-up':
      return result(
        'int ' + name + ' = ' + a + ';\n' + name + ' = ' + name + ' + ' + b + ';\n' + print(name),
        name +
          ' starts at ' +
          a +
          '. Adding ' +
          b +
          ' stores ' +
          (a + b) +
          ' in the same variable.',
        { ...{}, expected: String(a + b) },
      );
    case 'copy-not-link':
      return result(
        'int a = ' + a + ';\nint b = a;\na = ' + (a + b) + ';\n' + print('b'),
        'b copies the value ' + a + '. Updating a afterward does not change the copy in b.',
        { ...{}, expected: String(a) },
      );
    case 'order-matters':
      return result(
        'int n = ' + a + ';\nn = n + ' + b + ' * ' + c + ';\n' + print('n'),
        'Multiply first: ' +
          b +
          ' × ' +
          c +
          ' = ' +
          b * c +
          '. Then add ' +
          a +
          ', producing ' +
          (a + b * c) +
          '.',
        { ...{}, expected: String(a + b * c) },
      );
    case 'integer-slice': {
      const den = r.int(2, 7),
        whole = r.int(2, 8),
        num = den * whole + r.int(1, den - 1);
      return result(
        'int total = ' +
          num +
          ';\nint groups = ' +
          den +
          ';\nint each = total / groups;\n' +
          print('each'),
        'Both operands are ints. ' +
          num +
          ' / ' +
          den +
          ' keeps the whole part, ' +
          whole +
          ', and discards the fraction.',
        { ...{}, expected: String(whole) },
      );
    }
    case 'start-at-zero': {
      const index = r.int(0, ns.length - 1);
      return result(
        arr(array, ns) + print(array + '[' + index + ']'),
        'Indexes start at 0. Slot ' + index + ' contains ' + ns[index] + '.',
        { ...{ prompt: 'Which value lives at index ' + index + '?' }, expected: String(ns[index]) },
      );
    }
    case 'change-one-slot': {
      const index = r.int(1, ns.length - 1);
      return result(
        arr(array, ns) +
          array +
          '[' +
          index +
          '] = ' +
          array +
          '[0] + ' +
          b +
          ';\n' +
          print(array + '[' + index + ']'),
        'Only slot ' +
          index +
          ' changes. It receives ' +
          ns[0] +
          ' + ' +
          b +
          ' = ' +
          (ns[0] + b) +
          '.',
        { ...{}, expected: String(ns[0] + b) },
      );
    }
    case 'index-is-a-value': {
      const index = r.int(1, ns.length - 1);
      return result(
        arr(array, ns) + 'int i = 0;\ni += ' + index + ';\n' + print(array + '[i]'),
        'i becomes ' +
          index +
          ', so the read is ' +
          array +
          '[' +
          index +
          '], which contains ' +
          ns[index] +
          '.',
        { ...{}, expected: String(ns[index]) },
      );
    }
    case 'past-the-edge':
      return result(
        arr(array, ns) + print(array + '[' + ns.length + ']'),
        'This array has ' +
          ns.length +
          ' elements: indexes 0 through ' +
          (ns.length - 1) +
          '. Reading index ' +
          ns.length +
          ' is undefined behavior, with no promised output.',
        { ...{ faultExpected: 'out-of-bounds' }, expected: 'fault:out-of-bounds' },
      );
    case 'point-to-a-box':
      return result(
        'int x = ' + a + ';\nint *p = &x;\n' + print('*p'),
        '&x is the address of x. Following p with *p reads the original value, ' + a + '.',
        { ...{}, expected: String(a) },
      );
    case 'write-through':
      return result(
        'int x = ' + a + ';\nint *p = &x;\n*p = ' + c + ';\n' + print('x'),
        'p points to x. Writing ' + c + ' through *p updates x itself.',
        { ...{}, expected: String(c) },
      );
    case 'one-step-forward': {
      const index = r.int(1, ns.length - 1);
      return result(
        arr(array, ns) + 'int *p = ' + array + ';\np = p + ' + index + ';\n' + print('*p'),
        'Pointer arithmetic counts int elements. Moving ' +
          index +
          ' elements reaches slot ' +
          index +
          ', whose value is ' +
          ns[index] +
          '.',
        { ...{}, expected: String(ns[index]) },
      );
    }
    case 'nowhere-to-go':
      return result(
        'int *p = ' + r.pick(['NULL', '0']) + ';\n' + print('*p'),
        'A null pointer points to no int object. Dereferencing it is undefined behavior, not a guaranteed zero or a guaranteed crash.',
        { ...{ faultExpected: 'null-pointer' }, expected: 'fault:null-pointer' },
      );
    case 'make-some-space':
      return result(
        'int *p = malloc(2 * sizeof(int));\np[0] = ' +
          a +
          ';\np[1] = ' +
          c +
          ';\n' +
          print('p[1]') +
          '\nfree(p);',
        'The second int receives ' +
          c +
          ' and is read before free. These lessons assume malloc succeeds.',
        { ...{}, expected: String(c) },
      );
    case 'released-is-released':
      return result(
        'int *p = malloc(sizeof(int));\n*p = ' + a + ';\nfree(p);\n' + print('*p'),
        'free releases the allocation. p still holds an address, but it no longer gives valid access to the stored int.',
        { ...{ faultExpected: 'use-after-free' }, expected: 'fault:use-after-free' },
      );
    default:
      return result(
        'int *p = malloc(2 * sizeof(int));\np[0] = ' +
          a +
          ';\np[1] = ' +
          b +
          ';\nint *q = p + 1;\n*q = ' +
          c +
          ';\n' +
          print('p[1]') +
          '\nfree(p);',
        'q points to the second int in the same allocation. Writing ' +
          c +
          ' through q changes p[1] to ' +
          c +
          '.',
        { ...{}, expected: String(c) },
      );
  }
}
const cFamilies: Family[] = STARTER_CHALLENGES.map((q) => ({
  id: q.id,
  unit: q.unit,
  topic: 'c',
  difficulty: difficultyById[q.id],
  title: q.title,
  mode: 'trace',
  language: 'C',
  build: (r) => cBody(q.id, r),
}));
const reasoning = (
  id: string,
  unit: UnitId,
  difficulty: Difficulty,
  title: string,
  build: Family['build'],
  language: Challenge['language'] = 'pseudocode',
): Family => ({
  id,
  unit,
  topic: unit as Topic,
  difficulty,
  title,
  mode: 'reasoning',
  language,
  build,
});
export const FAMILIES: Family[] = [
  ...cFamilies,
  reasoning('binary-search-next', 'algorithms', 'easy', 'Cut the search space', (r) => {
    const ns = Array.from({ length: r.int(5, 9) }, (_, i) => (i + 1) * 3 + r.int(0, 1));
    const mid = Math.floor((ns.length - 1) / 2),
      target = r.pick(ns),
      at = ns[mid];
    const expected = target === at ? 'Return mid' : target > at ? 'lo = mid + 1' : 'hi = mid - 1';
    return {
      code:
        'sorted = [' +
        ns.join(', ') +
        ']\ntarget = ' +
        target +
        '\nlo = 0, hi = ' +
        (ns.length - 1) +
        '\nmid = ' +
        mid +
        '  // sorted[mid] = ' +
        at,
      prompt: 'What should binary search do next?',
      expected,
      wrong: ['Return mid', 'lo = mid + 1', 'hi = mid - 1', 'Search every element'].filter(
        (x) => x !== expected,
      ),
      explanation:
        'The middle value is ' +
        at +
        ', and the target is ' +
        target +
        '. ' +
        (target === at
          ? 'We found it.'
          : target > at
            ? 'Discard the smaller half by moving lo past mid.'
            : 'Discard the larger half by moving hi before mid.'),
      hint: 'Compare the target with the middle value.',
      data: { ns, target, mid },
    };
  }),
  reasoning('sorted-pair-strategy', 'algorithms', 'medium', 'A pair, with less work', (r) => {
    const ns = Array.from({ length: r.int(5, 8) }, (_, i) => 2 * i + r.int(0, 1));
    const target = ns[1] + ns.at(-2)!;
    return {
      code:
        'sorted = [' + ns.join(', ') + ']\ntarget sum = ' + target + '\nextra memory allowed: O(1)',
      prompt: 'Which approach finds whether a pair exists in O(n) time with O(1) extra space?',
      expected: 'Two pointers from opposite ends',
      wrong: [
        'Try every pair',
        'Build a hash set of all values',
        'Binary-search a partner for each value',
      ],
      explanation:
        'The array is already sorted. Move the low pointer when the sum is too small and the high pointer when it is too large. Each pointer moves at most n times. A hash set uses O(n) extra space; searching each partner costs O(n log n).',
      hint: 'Use the sorted order and the constant-space constraint.',
      data: { ns, target },
    };
  }),
  reasoning('rolling-window', 'algorithms', 'medium', 'A window worth keeping', (r) => {
    const ns = Array.from({ length: r.int(6, 9) }, () => r.int(-3, 12)),
      k = r.int(2, 4);
    const sums = ns.slice(k - 1).map((_, i) => ns.slice(i, i + k).reduce((a, b) => a + b, 0));
    return numeric(
      Math.max(...sums),
      'values = [' + ns.join(', ') + ']\nwindow size = ' + k,
      'What is the largest sum of exactly ' + k + ' consecutive values?',
      'Window sums are ' +
        sums.join(', ') +
        '. The largest is ' +
        Math.max(...sums) +
        '. A rolling sum updates by removing one old value and adding one new value.',
      'Slide a fixed-size window; don’t skip elements inside it.',
      { ns, k },
      [sums[0], sums.at(-1)!, ns.reduce((a, b) => a + b, 0)],
    );
  }),
  reasoning('graph-hops', 'algorithms', 'hard', 'Take the shortest hop', (r) => {
    const shortcut = r.pick([true, false]),
      target = r.pick(['D', 'E']);
    const edges = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
      ...(shortcut ? [['A', 'C']] : []),
    ];
    const expected = (target === 'D' ? 3 : 4) - Number(shortcut);
    return numeric(
      expected,
      'undirected edges:\n' + edges.map((e) => e.join(' — ')).join('\n'),
      'How many edges are in the shortest path from A to ' + target + '?',
      'The shortest path has ' +
        expected +
        ' edges. Breadth-first search finds shortest paths by edge count in an unweighted graph.',
      'Count edges, not nodes. The shortcut changes the route.',
      { edges, target },
    );
  }),
  reasoning('weighted-route', 'algorithms', 'hard', 'Weights change the plan', (r) => {
    const negative = r.pick([true, false]),
      n = r.int(5, 14);
    return {
      code:
        n +
        ' vertices, directed edges\nedge weights: ' +
        (negative ? 'may be negative' : 'nonnegative') +
        '\n' +
        (negative ? 'no negative cycles' : 'weights can differ'),
      prompt: 'Which statement about these shortest-path algorithms is correct?',
      expected: negative
        ? 'Bellman–Ford supports these weights'
        : 'Dijkstra supports these nonnegative weights',
      wrong: [
        negative
          ? 'Dijkstra always supports negative edges'
          : 'Dijkstra requires every weight to equal 1',
        'Breadth-first search ignoring weights',
        'Depth-first search stopping at first visit',
      ],
      explanation: negative
        ? 'Bellman–Ford supports negative edge weights and can detect reachable negative cycles. Ordinary Dijkstra is not correct in general with negative edges.'
        : 'Dijkstra supports nonnegative weighted edges. BFS ignores differing costs, and the first DFS path need not be cheapest. The weights do not all have to equal 1.',
      hint: 'The sign of an edge weight affects which guarantee you can use.',
      data: { negative },
    };
  }),
  reasoning('stack-top', 'structures', 'easy', 'Last in, first out', (r) => {
    const ns = Array.from({ length: 4 }, () => r.int(1, 30)),
      pops = r.int(1, 2),
      value = ns[ns.length - pops - 1];
    return numeric(
      value,
      'empty stack\n' +
        ns.map((n) => 'push(' + n + ')').join('\n') +
        '\npop()\n' +
        (pops === 2 ? 'pop()\n' : '') +
        'peek()',
      'What does peek() return?',
      'A stack removes the newest item first. After ' +
        pops +
        ' pop operations, the top is ' +
        value +
        '.',
      'Cross off the most recently pushed item first.',
      { ns, pops },
      ns,
    );
  }),
  reasoning('queue-front', 'structures', 'easy', 'First in, first out', (r) => {
    const ns = Array.from({ length: 4 }, () => r.int(1, 30)),
      removals = r.int(1, 2);
    return numeric(
      ns[removals],
      'empty queue\n' +
        ns.map((n) => 'enqueue(' + n + ')').join('\n') +
        '\ndequeue()\n' +
        (removals === 2 ? 'dequeue()\n' : '') +
        'front()',
      'What value is at the front now?',
      'A queue removes the oldest item first. The next remaining value is ' + ns[removals] + '.',
      'Read the operations from oldest to newest.',
      { ns, removals },
      ns,
    );
  }),
  reasoning('set-size', 'structures', 'medium', 'Duplicates don’t get chairs', (r) => {
    const ns = Array.from({ length: r.int(6, 10) }, () => r.int(1, 5));
    return numeric(
      new Set(ns).size,
      'set = {}\n' + ns.map((n) => 'set.add(' + n + ')').join('\n'),
      'How many distinct values are in the set?',
      'A set stores each distinct value once. The values are ' +
        [...new Set(ns)].sort((a, b) => a - b).join(', ') +
        '.',
      'Repeated insertions of the same value do not increase the size.',
      { ns },
      [ns.length, 5, new Set(ns).size + 1],
    );
  }),
  reasoning('heap-next', 'structures', 'hard', 'The minimum keeps moving', (r) => {
    const ns = Array.from({ length: 5 }, () => r.int(1, 30)),
      insert = r.int(1, 30),
      pops = r.int(1, 2);
    const result = [...ns, insert].sort((a, b) => a - b)[pops];
    return numeric(
      result,
      'min-heap contains: [' +
        ns.join(', ') +
        ']\ninsert(' +
        insert +
        ')\nremoveMin()\n' +
        (pops === 2 ? 'removeMin()\n' : '') +
        'peekMin()',
      'What value is at the root now?',
      'After insertion, sort the values conceptually and remove the ' +
        pops +
        ' smallest. The next smallest is ' +
        result +
        '. The displayed input is a collection, not a claimed internal heap layout.',
      'The root is the smallest remaining value, not necessarily the first number shown.',
      { ns, insert, pops },
      [Math.min(...ns), insert, Math.max(...ns)],
    );
  }),
  reasoning('single-pass-cost', 'complexity', 'easy', 'Count the visits', (r) => {
    const repeats = r.int(2, 7);
    return {
      code: 'repeat ' + repeats + ' times:\n  for each item in n items:\n    do O(1) work',
      prompt: 'As n grows, what is the total time complexity?',
      expected: 'O(n)',
      wrong: ['O(1)', 'O(n²)', 'O(log n)'],
      explanation:
        'The outer repeat count is the constant ' +
        repeats +
        '. ' +
        repeats +
        ' × n visits is O(n); fixed factors do not change the growth class.',
      hint: 'Which loop count grows with n?',
      data: { repeats },
    };
  }),
  reasoning('nested-loop-cost', 'complexity', 'medium', 'Loops inside loops', (r) => {
    const independent = r.pick([true, false]),
      letters = r.pick([
        ['n', 'm'],
        ['a', 'b'],
      ]);
    const inner = independent ? letters[1] : letters[0];
    return {
      code:
        'for i in 0 .. ' + letters[0] + '-1:\n  for j in 0 .. ' + inner + '-1:\n    do O(1) work',
      prompt: independent
        ? 'The two input sizes vary independently. What is the time complexity?'
        : 'Both loops use the same input size. What is the time complexity?',
      expected: independent
        ? 'O(' + letters[0] + ' × ' + letters[1] + ')'
        : 'O(' + letters[0] + '²)',
      wrong: [
        'O(' + letters[0] + ')',
        'O(log ' + letters[0] + ')',
        'O(' + letters[0] + ' + ' + inner + ')',
      ],
      explanation:
        'For each outer iteration, the whole inner loop runs. Multiply the loop bounds; do not add them.',
      hint: 'Count the work for one outer iteration, then multiply.',
      data: { independent, letters },
    };
  }),
  reasoning('halving-cost', 'complexity', 'medium', 'Half, then half again', (r) => {
    const divisor = r.pick([2, 3, 4]),
      work = r.int(2, 6);
    return {
      code:
        'remaining = n\nwhile remaining > 1:\n  do ' +
        work +
        ' units of O(1) work\n  remaining = floor(remaining / ' +
        divisor +
        ')',
      prompt: 'What is the asymptotic running time?',
      expected: 'O(log n)',
      wrong: ['O(n)', 'O(n log n)', 'O(n²)'],
      explanation:
        'Dividing by the constant ' +
        divisor +
        ' takes logarithmically many steps. The fixed ' +
        work +
        ' units of work per step do not change that class.',
      hint: 'Repeated division shrinks much faster than subtracting 1.',
      data: { divisor, work },
    };
  }),
  reasoning('sequential-cost', 'complexity', 'hard', 'Together doesn’t mean nested', (r) => {
    const sort = r.pick([true, false]),
      copies = r.int(2, 5);
    return {
      code:
        (sort ? 'comparison-sort n items: O(n log n)' : 'visit every ordered pair: O(n²)') +
        '\nthen, ' +
        copies +
        ' separate O(n) passes\n// the phases are sequential',
      prompt: 'What is the combined asymptotic running time?',
      expected: sort ? 'O(n log n)' : 'O(n²)',
      wrong: [sort ? 'O(n² log n)' : 'O(n³)', 'O(n)', 'O(log n)'],
      explanation:
        'Add sequential phases. The dominant term is ' +
        (sort ? 'n log n' : 'n²') +
        '; the fixed number of linear passes does not increase its order.',
      hint: 'Multiply nested work; add sequential work.',
      data: { sort, copies },
    };
  }),
  reasoning(
    'sql-filter',
    'sql',
    'easy',
    'Only rows that qualify',
    (r) => {
      const ns = Array.from({ length: r.int(5, 8) }, () => r.int(0, 10)),
        threshold = r.int(3, 7);
      return numeric(
        ns.filter((n) => n >= threshold).length,
        'WITH scores(value) AS (\n  VALUES ' +
          ns.map((n) => '(' + n + ')').join(', ') +
          '\n)\nSELECT COUNT(*) FROM scores\nWHERE value >= ' +
          threshold +
          ';',
        'How many rows does this query count?',
        'Keep every row whose value is at least ' +
          threshold +
          ', including duplicates. COUNT(*) counts the qualifying rows.',
        'Filter first, then count rows.',
        { ns, threshold },
      );
    },
    'SQL',
  ),
  reasoning(
    'sql-count-null',
    'sql',
    'medium',
    'A NULL-sized gap',
    (r) => {
      const ns = Array.from({ length: r.int(5, 8) }, (_, i) => (i % 3 === 0 ? null : r.int(0, 9)));
      return numeric(
        ns.filter((n) => n !== null).length,
        'WITH scores(value) AS (\n  VALUES ' +
          ns.map((n) => '(' + (n === null ? 'NULL' : n) + ')').join(', ') +
          '\n)\nSELECT COUNT(value) FROM scores;',
        'What does COUNT(value) return?',
        'COUNT(value) ignores NULL values. Zero is still a value and does count. COUNT(*) would count every row.',
        'NULL and 0 are different.',
        { ns },
        [ns.length, ns.filter((n) => n === null).length, 0],
      );
    },
    'SQL',
  ),
  reasoning(
    'sql-left-join',
    'sql',
    'hard',
    'The row that stays',
    (r) => {
      const users = r.int(3, 5),
        orders = Array.from({ length: r.int(2, 6) }, () => r.int(1, users - 1));
      const result = Array.from({ length: users }, (_, i) =>
        Math.max(1, orders.filter((u) => u === i + 1).length),
      ).reduce((a, b) => a + b, 0);
      return numeric(
        result,
        'WITH users(id) AS (\n  VALUES ' +
          Array.from({ length: users }, (_, i) => '(' + (i + 1) + ')').join(', ') +
          '\n), orders(user_id) AS (\n  VALUES ' +
          orders.map((n) => '(' + n + ')').join(', ') +
          '\n)\nSELECT COUNT(*) FROM users u\nLEFT JOIN orders o ON u.id = o.user_id;',
        'How many joined rows are counted?',
        'A matching order creates a row; several orders can repeat one user. Each user with no order still contributes one NULL-extended row.',
        'A LEFT JOIN keeps unmatched users, and can repeat matched users.',
        { users, orders },
        [users, orders.length, users + orders.length],
      );
    },
    'SQL',
  ),
  reasoning(
    'sql-rollback',
    'sql',
    'medium',
    'All of it, or none of it',
    (r) => {
      const initial = r.int(5, 20) * 10,
        change = r.int(1, 5) * 5;
      return numeric(
        initial,
        'initial balance = ' +
          initial +
          '\nBEGIN;\nUPDATE accounts SET balance = balance - ' +
          change +
          ';\nROLLBACK;\n// no concurrent transactions',
        'What balance remains after the rollback?',
        'ROLLBACK discards the transaction’s uncommitted update. The original balance, ' +
          initial +
          ', remains.',
        'ROLLBACK cancels this transaction, rather than committing part of it.',
        { initial, change },
        [initial - change, initial + change, 0],
      );
    },
    'scenario',
  ),
  reasoning(
    'bit-patterns',
    'systems',
    'easy',
    'A byte-sized possibility',
    (r) => {
      const bits = r.int(3, 10);
      return numeric(
        2 ** bits,
        'unsigned value\nwidth = ' + bits + ' bits',
        'How many distinct bit patterns can it represent?',
        'Each bit has two possibilities. ' +
          bits +
          ' independent bits give 2^' +
          bits +
          ' = ' +
          2 ** bits +
          ' distinct patterns. The largest unsigned value is one less.',
        'Count patterns, not the largest representable value.',
        { bits },
        [2 ** bits - 1, bits * 2, bits ** 2],
      );
    },
    'scenario',
  ),
  reasoning(
    'lost-update',
    'systems',
    'hard',
    'Two threads, one surprise',
    (r) => {
      const initial = r.int(2, 30),
        increment = r.int(1, 5);
      return numeric(
        initial + increment,
        'counter starts at ' +
          initial +
          '\nA reads counter into a\nB reads counter into b\nA writes a + ' +
          increment +
          '\nB writes b + ' +
          increment +
          '\n// plain reads/writes, exactly this order',
        'What is the final counter value in this schedule?',
        'Both reads see ' +
          initial +
          '. Each write stores ' +
          (initial + increment) +
          ', so the later write overwrites the same value. This fixed interleaving loses one increment; other schedules may differ.',
        'Track each thread’s saved read separately.',
        { initial, increment },
        [initial + 2 * increment, initial, increment],
      );
    },
    'scenario',
  ),
  reasoning(
    'lru-cache',
    'systems',
    'medium',
    'Who gets evicted?',
    (r) => {
      const capacity = r.int(2, 3),
        keys = r.shuffle(['A', 'B', 'C', 'D', 'E']).slice(0, capacity + 1);
      const accesses = [...keys.slice(0, capacity), keys[0], keys[capacity]],
        evicted = keys[1];
      return {
        code:
          'LRU cache, capacity ' +
          capacity +
          '\nstarts empty\naccess: ' +
          accesses.join(' → ') +
          '\n// a miss inserts that key',
        prompt: 'Which key is evicted on the final access?',
        expected: evicted,
        wrong: keys
          .filter((k) => k !== evicted)
          .concat('Nothing is evicted')
          .slice(0, 3),
        explanation:
          'Accessing ' +
          keys[0] +
          ' refreshes it. ' +
          evicted +
          ' is then least recently used. Inserting ' +
          keys[capacity] +
          ' evicts ' +
          evicted +
          '.',
        hint: 'Track recency after every access, including cache hits.',
        data: { capacity, accesses },
      };
    },
    'scenario',
  ),
  reasoning(
    'parallel-io',
    'systems',
    'medium',
    'Wait for both',
    (r) => {
      const a = r.int(2, 8) * 100,
        b = r.int(2, 8) * 100;
      return numeric(
        Math.max(a, b),
        'independent request A: ' +
          a +
          ' ms\nindependent request B: ' +
          b +
          ' ms\nstart both at t = 0\nwait until both finish\n// ignore overhead and contention',
        'After how many milliseconds can you continue?',
        'The requests overlap. Waiting for both completes when the slower one finishes: max(' +
          a +
          ', ' +
          b +
          ') = ' +
          Math.max(a, b) +
          ' ms.',
        'Concurrent durations do not simply add.',
        { a, b },
        [a + b, Math.min(a, b), 0],
      );
    },
    'scenario',
  ),
  ...CSCB07_FAMILIES,
];
export type QuestionRef = { id: string; seed: number; ticket?: string };
export function questionMaterial(q: Challenge) {
  return JSON.stringify([q.id, q.prompt, q.code, q.expected]);
}
export function makeQuestion(id: string, seed: number): Challenge {
  const f = FAMILIES.find((item) => item.id === id);
  if (!f || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Unknown question or seed');
  const r = new Random(hash(id) ^ seed),
    body = f.build(r);
  const values = [...new Set([body.expected, ...body.wrong])];
  if (values.length !== 4) throw new Error('A question must have four distinct answers: ' + id);
  const choices = r.shuffle(values).map((value) => ({
    value,
    label: value.startsWith('fault:')
      ? 'Undefined behavior'
      : value === 'Breadth-first search ignoring weights'
        ? 'BFS can always ignore these edge weights'
        : value === 'Depth-first search stopping at first visit'
          ? 'The first DFS path is always shortest'
          : value,
  }));
  const question: Challenge = {
    id: f.id,
    unit: f.unit,
    topic: f.topic,
    difficulty: f.difficulty,
    title: f.title,
    mode: f.mode,
    language: f.language,
    ...body,
    seed,
    variantId: '',
    choices,
  };
  question.variantId = id + ':' + hash(questionMaterial(question)).toString(16);
  return question;
}
export function materialize(ref: QuestionRef): Challenge {
  return { ...makeQuestion(ref.id, ref.seed), rankTicket: ref.ticket };
}
export function freshVariant(id: string, seed: number, recent: readonly string[]): Challenge {
  let q = makeQuestion(id, seed >>> 0);
  for (let i = 0; i < 32 && recent.includes(q.variantId); i++)
    q = makeQuestion(id, (seed + i + 1) >>> 0);
  return q;
}
export function selectPractice(
  ids: string[],
  seed: number,
  recent: readonly string[] = [],
  count = 5,
): Challenge[] {
  return new Random(seed)
    .shuffle([...new Set(ids)])
    .slice(0, count)
    .map((id, i) => freshVariant(id, (seed + i * 2654435761) >>> 0, recent));
}
