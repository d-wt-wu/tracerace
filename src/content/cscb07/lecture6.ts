// Scope ends before System Modelling on PDF page 3. No later Lecture 6 material.
import { family, output, question } from './shared';
import { LIST_CPP } from './models';

export const lecture6 = [
  family(
    6,
    'iterator-advance',
    'medium',
    'A position moves one link',
    '2–3 (before System Modelling)',
    (r) => {
      const a = r.int(2, 10),
        b = a + r.int(2, 6),
        d = r.int(1, 5);
      return output(
        `${LIST_CPP}\nint main() {\n  List values; values.addToFront(${a}); values.addToFront(${b});\n  auto it = values.begin();\n  ++it;\n  *it += ${d};\n  std::cout << values.ith(0) << " " << values.ith(1);\n}`,
        `${b} ${a + d}`,
        'begin denotes the head. One prefix increment reaches the second node. Dereference returns that stored int by reference, so the assignment updates only that node.',
        'Trace the position separately from the value stored at it.',
        [`${b + d} ${a}`, `${a} ${b}`, `${b} ${a}`],
      );
    },
  ),
  family(
    6,
    'range-reference',
    'medium',
    'Copy or reference in the loop?',
    '3 (before System Modelling)',
    (r) => {
      const n = r.int(2, 20),
        d = r.int(2, 7),
        reference = r.pick([true, false]);
      return output(
        `${LIST_CPP}\nint main() {\n  List values; values.addToFront(${n});\n  for (auto ${reference ? '&' : ''}item : values) item += ${d};\n  std::cout << values.ith(0);\n}`,
        reference ? n + d : n,
        reference
          ? 'auto& binds to the int returned by iterator dereference, so mutation reaches the stored item.'
          : 'auto creates a local int copy on each iteration. Mutating that copy does not modify the list.',
        'Type inference does not erase the difference between a value and a reference.',
      );
    },
  ),
  family(6, 'position-not-value', 'hard', 'Equal values, different positions', '2', (r) => {
    const n = r.int(2, 30);
    return output(
      `${LIST_CPP}\nint main() {\n  List values; values.addToFront(${n}); values.addToFront(${n});\n  auto first = values.begin();\n  auto second = first; ++second;\n  std::cout << (first != second);\n}`,
      1,
      'The two iterators store different node addresses, even though the int values are equal. Position comparison must compare those addresses; comparing data would incorrectly merge distinct positions.',
      'Iterator identity is about the current node, not the current integer.',
      ['0', String(n), 'Compile-time error'],
    );
  }),
  family(6, 'empty-range', 'easy', 'An empty range visits no items', '2–3', (r) => {
    const d = r.int(2, 9);
    return output(
      `${LIST_CPP}\nint main() {\n  List values;\n  int visits = 0;\n  for (auto it = values.begin(); it != values.end(); ++it) visits += ${d};\n  std::cout << visits;\n}`,
      0,
      'For an empty list, begin and end both contain the null boundary position. The initial comparison is false, so neither dereference nor increment occurs and visits remains zero.',
      'Check the loop condition before imagining its first body execution.',
      ['1', String(d), 'Undefined behavior is unavoidable'],
    );
  }),
  family(
    6,
    'end-boundary',
    'easy',
    'End is not an item',
    '2–3',
    (r) => {
      const n = r.int(2, 20);
      return question(
        `A valid list contains ${n} nodes.\nauto it = values.end();\n// end stores nullptr in this iterator implementation.`,
        'What is true about *it at this position?',
        'Dereferencing it is undefined behavior; there is no item there.',
        [
          'It always returns the last integer.',
          'It always returns 0.',
          'It allocates a new node automatically.',
        ],
        'end is a boundary used in comparisons, not a valid element. This implementation would dereference a null Node pointer. There is no guaranteed value or crash to predict.',
        'Distinguish reaching end from visiting the last valid node.',
      );
    },
    'scenario',
  ),
  family(6, 'prefix-return', 'medium', 'Advance and return this iterator', '2', (r) => {
    const name = r.pick(['p', 'current', 'position']);
    return question(
      `Iterator &operator++() {\n  ${name} = ${name}->next;\n  // missing return\n}`,
      'Which return completes prefix increment with the declared type?',
      'return *this;',
      ['return this;', `return *${name};`, 'return nullptr;'],
      'The result type is Iterator&, a reference to the current iterator object. *this denotes that object. this itself is a pointer, and dereferencing the node yields an unrelated Node.',
      'Compare the declared return type with the type of each expression.',
    );
  }),
  family(6, 'begin-end', 'easy', 'Wrap a position', '2', (r) => {
    const askEnd = r.pick([true, false]),
      field = r.pick(['head', 'firstNode']);
    return question(
      `Node *${field}; // first node, or nullptr when empty\n// Iterator has an explicit Iterator(Node*) constructor.`,
      `Which expression implements ${askEnd ? 'end()' : 'begin()'} correctly for both empty and nonempty lists?`,
      askEnd ? 'Iterator{nullptr}' : `Iterator{${field}}`,
      [askEnd ? `Iterator{${field}}` : 'Iterator{nullptr}', `*${field}`, 'Iterator{this}'],
      askEnd
        ? 'end wraps the null sentinel, independent of the current last item. begin wraps the head; for an empty list these positions coincide.'
        : 'begin wraps the head pointer. It does not dereference the head, so constructing begin is safe even for an empty list.',
      'An iterator object wraps a Node pointer; it is not the node itself.',
    );
  }),
  family(
    6,
    'indexed-cost',
    'hard',
    'Count the restarted walks',
    '1–3',
    (r) => {
      const n = r.int(4, 15),
        expected = (n * (n - 1)) / 2;
      return {
        ...question(
          `A ${n}-node linked list implements ith(i) by\nstarting at head and advancing exactly i links.\nRead ith(0), ith(1), ..., ith(${n - 1}).`,
          'How many link advances occur in total?',
          String(expected),
          [String(n), String(n * n), String(expected + n)],
          `The total is 0 + 1 + ... + ${n - 1} = ${n}×${n - 1}/2 = ${expected}. Repeated indexing is quadratic; constant-time use of each value does not remove those repeated walks.`,
          'Sum the work for every index, including index zero.',
        ),
        data: { n, model: 'indexed-links' },
      };
    },
    'scenario',
  ),
  family(
    6,
    'iterator-cost',
    'medium',
    'One advance per node',
    '2–3',
    (r) => {
      const n = r.int(4, 15);
      return {
        ...question(
          `Walk all ${n} items from begin() to end().\nEach ++it follows exactly one next link.\nCount the final last-node-to-end advance too.`,
          'How many iterator advances occur?',
          String(n),
          [String(n - 1), String((n * (n - 1)) / 2), String(n * n)],
          `There is one increment for each of the ${n} visited nodes, including the last step to end. With O(1) comparison and dereference, the total traversal is linear.`,
          'The iterator retains its position rather than restarting from head.',
        ),
        data: { n, model: 'iterator-links' },
      };
    },
    'scenario',
  ),
  family(6, 'iterator-transfer', 'hard', 'Count through the public interface', '2–3', (r) => {
    const limit = r.int(2, 10),
      ns = Array.from({ length: r.int(0, 6) }, () => r.int(limit - 3, limit + 3));
    const expected = ns.filter((n) => n > limit).length;
    return output(
      `${LIST_CPP}\nint countAbove(List &values, int limit) {\n  int count = 0;\n  for (auto it = values.begin(); it != values.end(); ++it)\n    if (*it > limit) ++count;\n  return count;\n}\nint main() {\n  List values;\n${[
        ...ns,
      ]
        .reverse()
        .map((n) => `  values.addToFront(${n});`)
        .join('\n')}\n  std::cout << countAbove(values, ${limit});\n}`,
      expected,
      `The values are [${ns.join(', ')}]. Exactly ${expected} are strictly greater than ${limit}; equality does not count. The function changes no links, visits once, and uses constant extra space.`,
      'Check the strict comparison, including the value exactly at the threshold.',
    );
  }),
];
