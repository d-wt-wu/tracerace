import { family, output, question } from './shared';

export const primer = [
  family(1, 'basic-values', 'easy', 'Read an assignment', '1–2 (prerequisite bridge)', (r) => {
    const a = r.int(2, 12),
      b = r.int(2, 7);
    return output(
      `int main() {\n  int count = ${a};\n  count = count + ${b};\n  std::cout << count;\n}`,
      a + b,
      `int creates an integer object. The second statement reads its old value (${a}), adds ${b}, and stores ${a + b} back into count. cout prints that final value.`,
      '= stores a value; it does not ask whether two values are equal.',
    );
  }),
  family(
    1,
    'basic-comparison',
    'easy',
    'Assignment versus comparison',
    '1–2 (prerequisite bridge)',
    (r) => {
      const a = r.int(2, 12),
        equal = r.pick([true, false]),
        b = equal ? a : a + 1;
      return output(
        `int main() {\n  int value = ${a};\n  bool same = (value == ${b});\n  std::cout << same;\n}`,
        Number(equal),
        `== compares rather than assigning. ${a} ${equal ? 'equals' : 'does not equal'} ${b}, so same is ${equal ? 'true (1)' : 'false (0)'}. The comparison does not change value.`,
        'The double equals sign produces a bool; cout uses 0/1 here.',
      );
    },
  ),
  family(
    1,
    'basic-return',
    'easy',
    'A function supplies a result',
    '2–4 (prerequisite bridge)',
    (r) => {
      const a = r.int(2, 10),
        b = r.int(2, 5);
      return output(
        `int scale(int n) { return n * ${b}; }\nint main() {\n  int input = ${a};\n  int result = scale(input);\n  std::cout << result;\n}`,
        a * b,
        `The by-value parameter n starts as ${a}. return supplies ${a * b} to the call expression; result stores that value. Returning a result does not require changing input.`,
        'Follow the argument into the parameter, then the returned value back to the call.',
      );
    },
  ),
  family(
    1,
    'basic-void',
    'easy',
    'void has no returned value',
    '2–3 (prerequisite bridge)',
    (r) => {
      const n = r.int(2, 25);
      return question(
        `void display(int n) { std::cout << n; }\n// a call display(${n}) prints ${n}`,
        'What does void describe here?',
        'The function does not return a value to its caller.',
        [
          'The function cannot take a parameter.',
          'The function must change its caller’s int.',
          'The function is forbidden to print output.',
        ],
        'A void function performs an action without returning a result value. It may still accept arguments, print, and (with appropriate access) modify objects.',
        'Output to a stream and a returned value are different channels.',
      );
    },
  ),
  family(
    1,
    'basic-branch',
    'easy',
    'Only the selected branch runs',
    '2–4 (prerequisite bridge)',
    (r) => {
      const a = r.int(2, 12),
        cutoff = r.int(3, 10);
      return output(
        `int main() {\n  int score = ${a};\n  if (score > ${cutoff}) score += 2;\n  else score -= 1;\n  std::cout << score;\n}`,
        a > cutoff ? a + 2 : a - 1,
        `The condition ${a} > ${cutoff} is ${a > cutoff ? 'true' : 'false'}, so only the ${a > cutoff ? 'first' : 'else'} branch updates score.`,
        'Evaluate the condition once before choosing the branch.',
      );
    },
  ),
  family(1, 'basic-loop', 'medium', 'Repeat a small step', '2–4 (prerequisite bridge)', (r) => {
    const n = r.int(3, 8);
    return output(
      `int main() {\n  int total = 0;\n  for (int i = 0; i < ${n}; ++i) total += i;\n  std::cout << total;\n}`,
      (n * (n - 1)) / 2,
      `The body sees i = 0 through ${n - 1}. The strict less-than excludes ${n}. Adding those values gives ${(n * (n - 1)) / 2}. Initialization occurs once; the condition is checked before each body.`,
      'List the values of i, then accumulate total.',
    );
  }),
  family(
    1,
    'basic-scope',
    'medium',
    'A new local name shadows the old one',
    '2–4 (prerequisite bridge)',
    (r) => {
      const a = r.int(2, 12),
        b = a + r.int(2, 8);
      return output(
        `int main() {\n  int value = ${a};\n  { int value = ${b}; ++value; }\n  std::cout << value;\n}`,
        a,
        'The inner declaration creates another int with a narrower scope. It shadows the outer name; changing it does not modify the outer object, which remains available after the block.',
        'A declaration with a type creates an object; it is not assignment to the outer name.',
      );
    },
  ),
  family(1, 'basic-struct', 'easy', 'A type and its instances', '2', (r) => {
    const a = r.int(2, 12),
      b = a + r.int(2, 6),
      d = r.int(1, 5);
    return output(
      `struct Point { int x, y; };\nint main() {\n  Point first{${a}, ${b}};\n  Point second = first;\n  second.x += ${d};\n  std::cout << first.x << " " << second.x;\n}`,
      `${a} ${a + d}`,
      'Point is a type. first and second are separate objects with their own int fields. Copying these int fields produces independent values; changing second.x leaves first.x unchanged.',
      'The type describes the fields; each instance stores its own fields.',
      [`${a + d} ${a + d}`, `${a} ${a}`, `${b} ${b + d}`],
    );
  }),
  family(
    1,
    'basic-member-pointer',
    'easy',
    'Access a field through a pointer',
    '2 (prerequisite bridge)',
    (r) => {
      const n = r.int(2, 20),
        d = r.int(2, 6);
      return output(
        `struct Item { int value; };\nint main() {\n  Item item{${n}};\n  Item *p = &item;\n  p->value += ${d};\n  std::cout << item.value;\n}`,
        n + d,
        'p->value means (*p).value. The pointer addresses item, so this field update reaches item.value. The pointer is a separate object, not another Item.',
        'Follow the pointer, then select the field.',
      );
    },
  ),
];
