import { family, output, question } from './shared';

export const lecture2 = [
  family(2, 'matching-delete', 'easy', 'Match the allocation', '1–2', (r) => {
    const array = r.pick([true, false]),
      n = r.int(3, 12);
    return question(
      `int *values = new int${array ? `[${n}]` : `{${n}}`};`,
      'Which statement correctly releases this allocation?',
      array ? 'delete[] values;' : 'delete values;',
      [array ? 'delete values;' : 'delete[] values;', 'free(values);', 'values = nullptr;'],
      array
        ? 'An array new-expression must be paired with delete[]. A mismatched delete is undefined behavior, free is a different allocation family, and setting a pointer to null does not release its allocation.'
        : 'A scalar new-expression is paired with delete. delete[] mismatches the allocation, free is inappropriate, and assigning nullptr would lose the address without freeing the int.',
      'Was one object allocated, or an array?',
    );
  }),
  family(2, 'pointer-lifetime', 'medium', 'The pointer leaves first', '1–2', (r) => {
    const n = r.int(3, 30);
    return question(
      `void build() {\n  int *p = new int{${n}};\n  // p is not saved or deleted\n}`,
      'After build returns normally, what happened?',
      'The local pointer is gone; the allocated int is leaked.',
      [
        'Both the pointer and the allocated int were automatically destroyed.',
        'The int moved from the heap onto the stack.',
        'Returning from a function is always undefined behavior here.',
      ],
      'The lifetime of the local pointer is separate from the allocation it addresses. Destroying a raw pointer does not perform delete on its pointee; with no saved address, this allocation is leaked.',
      'A raw pointer does not automatically own and clean up its pointee.',
    );
  }),
  family(2, 'allocation-value', 'easy', 'An independent heap value', '1–2', (r) => {
    const n = r.int(4, 20),
      d = r.int(2, 6);
    return output(
      `int main() {\n  int local = ${n};\n  int *p = new int{local};\n  local += ${d};\n  std::cout << *p;\n  delete p;\n}`,
      n,
      `The heap int was initialized with a copy of ${n}. Updating local does not change that independent int. The final delete matches scalar new.`,
      'Which object receives the later assignment?',
    );
  }),
  family(
    2,
    'testing-view',
    'easy',
    'What can the tester see?',
    '2–3',
    (r) => {
      const [access, answer] = r.pick([
        ['only the written specification', 'Black-box testing'],
        ['the complete implementation and its branches', 'White-box testing'],
        ['some internal design details, but not the full implementation', 'Grey-box testing'],
      ] as const);
      return question(
        `A tester chooses checks using ${access}.`,
        'Which testing approach describes their knowledge?',
        answer,
        [
          'Black-box testing',
          'White-box testing',
          'Grey-box testing',
          'Testing guarantees correctness',
        ].filter((a) => a !== answer),
        'Black-box testing uses specified behavior; white-box testing uses implementation knowledge; grey-box testing uses partial internal knowledge. None of these approaches proves arbitrary programs correct.',
        'This classification concerns available knowledge, not whether a test passed.',
      );
    },
    'scenario',
  ),
  family(
    2,
    'boundary',
    'medium',
    'Find the off-by-one',
    '3',
    (r) => {
      const min = r.int(3, 12),
        max = min + r.int(5, 12),
        wrongMin = r.pick([true, false]);
      const answer = wrongMin ? min : max;
      return question(
        `Specification: accept every integer in [${min}, ${max}], inclusive.\nImplementation: n ${wrongMin ? '>' : '>='} ${min} && n ${wrongMin ? '<=' : '<'} ${max}`,
        'Which valid input exposes this incorrect rejection?',
        String(answer),
        [String(min + 1), String(max - 1), String(Math.floor((min + max) / 2))]
          .filter((x, i, a) => a.indexOf(x) === i)
          .concat('No valid input exposes it')
          .slice(0, 3),
        `${answer} is inside the specified inclusive range but fails the implementation's strict comparison at that boundary. Interior values do not reveal this off-by-one error.`,
        'Compare the inclusive specification to each strict comparison.',
      );
    },
    'scenario',
  ),
  family(
    2,
    'specified-oracle',
    'medium',
    'Do we have an expected result?',
    '3–4',
    (r) => {
      const limit = r.int(20, 70),
        specified = r.pick([true, false]);
      return question(
        `Specification: read an integer from 0 through ${limit}.\n${specified ? 'For non-integer input, print ERROR.' : 'No behavior is specified for non-integer input.'}\nCandidate input: hello`,
        'What can a specification-based test assert for this input?',
        specified ? 'The output must be ERROR.' : 'There is no specified output to assert.',
        [
          specified ? 'There is no specified output to assert.' : 'The output must be ERROR.',
          'The output must be 0.',
          'The program must crash.',
        ],
        specified
          ? 'The specification defines non-integer behavior, so ERROR is a valid oracle. Invalid format alone does not imply that no test can be written.'
          : 'The written contract supplies no oracle for this input. That is an unspecified application requirement, not automatically C++ language undefined behavior or a requirement to crash.',
        'Use the contract given in this question; do not invent an error policy.',
      );
    },
    'scenario',
  ),
  family(
    2,
    'regression',
    'easy',
    'After the fix',
    '4',
    (r) => {
      const old = r.int(7, 35),
        added = r.int(2, 6);
      return question(
        `A program passed ${old} meaningful tests.\nYou fix a bug and add ${added} tests for it.`,
        'Which next step checks for regressions?',
        `Rerun all ${old + added} retained and new tests.`,
        [
          `Run only the ${added} new tests.`,
          'Delete old tests because the implementation changed.',
          'Skip testing if the code compiles.',
        ],
        'A bug fix can break previously working behavior. Retaining relevant old tests and adding the bug cases checks both the repaired behavior and regressions; compilation alone is not enough.',
        'A regression affects behavior that used to work.',
      );
    },
    'scenario',
  ),
  family(2, 'this', 'medium', 'Which object is this?', '4–5', (r) => {
    const a = r.int(3, 12),
      b = a + r.int(2, 6),
      d = r.int(1, 4);
    return output(
      `struct Counter {\n  int value;\n  void add(int value) { this->value += value; }\n};\nint main() {\n  Counter first{${a}}, second{${b}};\n  second.add(${d});\n  std::cout << first.value << " " << second.value;\n}`,
      `${a} ${b + d}`,
      `The receiver is second, so this points to second. this->value names its field; the unqualified parameter value is ${d}. first is unchanged.`,
      'Separate the receiver field from the identically named parameter.',
      [`${a + d} ${b}`, `${a} ${b}`, `${a + d} ${b + d}`],
    );
  }),
  family(2, 'method-definition', 'medium', 'Define that class method', '4–5', (r) => {
    const n = r.int(2, 25),
      qualified = r.pick([true, false]);
    const code = `struct Meter { int read() const; };\nint ${qualified ? 'Meter::' : ''}read()${qualified ? ' const' : ''} { return ${n}; }\nint main() { Meter m; return m.read(); }`;
    const expected = qualified ? 'Builds successfully' : 'Link-time error';
    return {
      ...question(
        code,
        'What happens when this complete program is compiled and linked?',
        expected,
        [
          'Builds successfully',
          'Compile-time syntax error',
          'Link-time error',
          'A required runtime exception',
        ].filter((v) => v !== expected),
        qualified
          ? 'Meter::read defines the declared member, with the matching const qualifier. Scope resolution connects the definition to Meter.'
          : 'A free read function does not define Meter::read. The source compiles into an object file, but linking fails because the called member lacks a definition.',
        'Distinguish a valid declaration from an available definition.',
      ),
      data: {
        cpp: {
          kind: 'compile',
          compiles: qualified,
          phase: qualified ? 'link' : 'missing-definition',
        },
      },
    };
  }),
  family(
    2,
    'test-limit',
    'hard',
    'What did passing establish?',
    '2–3',
    (r) => {
      const n = r.int(20, 300);
      return question(
        `A discount validator passes ${n} selected inputs.\nIts input space is much larger than that test suite.`,
        'Which conclusion is justified?',
        'No mismatch was found on the tested cases.',
        [
          'The program is correct on every possible input.',
          'Every branch and logical path must have run.',
          'The implementation cannot contain a hidden special case.',
        ],
        'Passing selected cases establishes agreement on those cases. It does not establish complete input coverage, branch coverage, or the absence of hidden behavior.',
        'Distinguish evidence from a proof over the entire input space.',
      );
    },
    'scenario',
  ),
];
