import { family, output, compilation, question } from './shared';

export const lecture1 = [
  family(1, 'alias', 'easy', 'One variable, two names', '3', (r) => {
    const n = r.int(3, 22),
      d = r.int(2, 8);
    return output(
      `int main() {\n  int score = ${n};\n  int &alias = score;\n  alias += ${d};\n  std::cout << score;\n}`,
      n + d,
      `alias denotes the same int as score, so writing through alias changes score to ${n + d}. A reference is an alias, not a separate copied int.`,
      'Count objects, not variable names.',
    );
  }),
  family(1, 'not-rebound', 'medium', 'Assignment does not rebind', '3', (r) => {
    const a = r.int(2, 12),
      b = a + r.int(2, 6),
      d = r.int(1, 4);
    return output(
      `int main() {\n  int left = ${a}, right = ${b};\n  int &ref = left;\n  ref = right;\n  ref += ${d};\n  std::cout << left << " " << right;\n}`,
      `${b + d} ${b}`,
      `ref remains an alias for left. ref = right copies ${b} into left; the next assignment changes only left. right remains ${b}.`,
      'A reference cannot be reseated after initialization.',
      [`${a} ${b + d}`, `${a} ${b}`, `${b + d} ${b + d}`],
    );
  }),
  family(1, 'value-parameter', 'easy', 'The local copy', '2', (r) => {
    const n = r.int(4, 24),
      d = r.int(2, 9);
    return output(
      `void adjust(int value) { value += ${d}; }\nint main() {\n  int level = ${n};\n  adjust(level);\n  std::cout << level;\n}`,
      n,
      `The parameter is a separate int initialized from level. Changing that copy leaves the caller's level at ${n}.`,
      'Read the parameter type before tracing the assignment.',
    );
  }),
  family(1, 'reference-parameter', 'easy', 'The caller changes', '3', (r) => {
    const n = r.int(4, 24),
      d = r.int(2, 9);
    return output(
      `void adjust(int &value) { value += ${d}; }\nint main() {\n  int level = ${n};\n  adjust(level);\n  std::cout << level;\n}`,
      n + d,
      `The int& parameter aliases the caller's level. Adding ${d} changes the original object to ${n + d}; no separate int parameter object is being modified.`,
      'The ampersand is part of the parameter type.',
    );
  }),
  family(1, 'reference-address', 'medium', 'Whose address is that?', '3', (r) => {
    const n = r.int(2, 30);
    return output(
      `int main() {\n  int item = ${n};\n  int &alias = item;\n  std::cout << (&alias == &item);\n}`,
      1,
      'Taking the address through alias obtains the address of item. The comparison is true, and bools print as 1 without boolalpha.',
      'A reference expression denotes the referred-to object.',
      ['0', String(n), 'Compile-time error'],
    );
  }),
  family(1, 'literal-binding', 'medium', 'May this reference bind?', '3–4', (r) => {
    const n = r.int(2, 40),
      isConst = r.pick([true, false]);
    return compilation(
      `int main() {\n  ${isConst ? 'const ' : ''}int &ref = ${n};\n  (void)ref;\n}`,
      isConst,
      isConst
        ? 'A const lvalue reference may bind to this temporary int; its lifetime is extended to the lifetime of this local reference.'
        : 'A non-const lvalue reference cannot bind to an int literal. This is rejected during compilation, not a runtime fault.',
      'const int& and int& have different binding rules.',
    );
  }),
  family(1, 'const-write', 'easy', 'A read-only view', '2, 4', (r) => {
    const n = r.int(2, 40),
      write = r.pick([true, false]);
    return compilation(
      `int main() {\n  int count = ${n};\n  const int &view = count;\n  ${write ? 'view += 1;' : 'count += 1;'}\n  (void)view;\n}`,
      !write,
      write
        ? 'The const reference prohibits modification through view, even though count itself is mutable. The assignment is ill-formed.'
        : 'The original count is mutable. A const reference restricts this access path; it does not make the original object globally const.',
      'Ask which access path performs the write.',
    );
  }),
  family(
    1,
    'large-parameter',
    'medium',
    'Read it without copying it',
    '4',
    (r) => {
      const name = r.pick(['Image', 'Report', 'Map']),
        size = r.int(20, 80);
      return question(
        `${name} contains ${size} MB of data.\ninspect must read it, avoid a full copy,\nand prevent writes through its parameter.`,
        'Which parameter best expresses these requirements?',
        `const ${name} &value`,
        [`${name} value`, `${name} &value`, `${name} *const value`],
        'A const reference avoids a by-value copy and prohibits ordinary mutation through the parameter. A const pointer makes the pointer itself fixed, not the object it points to.',
        'Distinguish const pointee/reference access from a const pointer variable.',
      );
    },
    'scenario',
  ),
  family(1, 'reference-to-pointer', 'hard', 'Changing the caller’s pointer', '3', (r) => {
    const a = r.int(3, 15),
      b = a + r.int(2, 7);
    return output(
      `void redirect(int *&p, int &target) { p = &target; }\nint main() {\n  int first = ${a}, second = ${b};\n  int *p = &first;\n  redirect(p, second);\n  std::cout << *p;\n}`,
      b,
      `int*& is a reference to the caller's pointer. Assigning p in redirect changes which int that pointer addresses, so dereferencing it reads second (${b}).`,
      'The pointer is passed by reference; the ints are distinct objects.',
    );
  }),
  family(1, 'endl', 'easy', 'A newline with a side effect', '1–2', (r) => {
    const n = r.int(2, 40);
    return question(
      `std::cout << ${n} << std::endl;`,
      'What does std::endl add beyond inserting a newline?',
      'It flushes the output stream.',
      [
        'It terminates the program.',
        'It frees the stream’s memory.',
        'It changes the stream’s integer base.',
      ],
      'std::endl inserts a newline and requests a stream flush. It does not return from main, deallocate the stream, or change numeric formatting.',
      'Think about buffered output.',
    );
  }),
];
