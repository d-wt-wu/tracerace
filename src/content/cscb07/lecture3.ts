import { family, output, compilation, question } from './shared';

export const lecture3 = [
  family(
    3,
    'module-role',
    'easy',
    'A module has three roles',
    '1–2',
    (r) => {
      const name = r.pick(['sensor', 'ledger', 'vector2']),
        role = r.pick(['interface', 'implementation', 'client']);
      const lines = {
        interface: `export module ${name};`,
        implementation: `module ${name};`,
        client: `import ${name};`,
      };
      return question(
        `File role: ${role}\nNamed module: ${name}`,
        'Which line begins the relevant module declaration or import?',
        lines[role as keyof typeof lines],
        Object.values(lines)
          .filter((v) => v !== lines[role as keyof typeof lines])
          .concat(`using namespace ${name};`),
        'The interface declares export module; its implementation uses module without export; a client imports the module. These are different source files, not three lines in one unit.',
        'Separate defining a module from using it.',
      );
    },
    'scenario',
  ),
  family(
    3,
    'compile-only',
    'easy',
    'Before the linker',
    '2',
    (r) => {
      const name = r.pick(['counter', 'point', 'record']);
      return question(
        `g++20 -c ${name}.cc`,
        'What is the intended result of this course command?',
        'An object file; no final executable is linked.',
        [
          'A complete running executable.',
          'Only a text copy of every imported module.',
          'A mandatory execution of all unit tests.',
        ],
        '-c selects compilation without the final link. The course environment supplies the g++20 command; that alias need not exist on a personal computer.',
        'Compilation and linking are separate build stages.',
      );
    },
    'scenario',
  ),
  family(
    3,
    'dependency-order',
    'medium',
    'Build the dependency first',
    '1–2',
    (r) => {
      const name = r.pick(['meter', 'canvas', 'clock']);
      return question(
        `${name}.cc: module interface\n${name}-impl.cc: implementation\nmain.cc: client importing ${name}`,
        'Which sequence respects dependencies and then builds the executable?',
        'Interface first, implementation/client next, then link object files.',
        [
          'Link first, then compile the interface.',
          'Client before the missing interface, then ignore the failure.',
          'Compile the implementation only; imports run the client.',
        ],
        'Build the interface before units that depend on it. The implementation and client can then be built in either dependency-valid order, and their object files are linked together.',
        'An importer needs the exported interface before it can be compiled.',
      );
    },
    'scenario',
  ),
  family(3, 'declaration-definition', 'medium', 'A promise and its body', '1', (r) => {
    const name = r.pick(['doubleIt', 'tripleIt', 'adjust']),
      n = r.int(2, 6);
    return question(
      `int ${name}(int value);\nint ${name}(int value) { return value * ${n}; }`,
      'How do the first and second lines differ?',
      'The first declares the function; the second defines it.',
      [
        'Both lines are separate function definitions.',
        'The first calls the function; the second declares a variable.',
        'Only the first can appear in a program.',
      ],
      'The declaration supplies a name and function type; the definition additionally supplies the body. Calling a declared function still requires an appropriate definition at link time.',
      'Look for a function body, not just a parameter list.',
    );
  }),
  family(3, 'include-import', 'medium', 'Text inclusion or dependency?', '2', (r) => {
    const name = r.pick(['shape', 'colour', 'stats']);
    return question(
      `#include "${name}.h"\n// compared with\nimport ${name};`,
      'Which statement correctly distinguishes these mechanisms?',
      '#include inserts header text; import uses a module’s exported interface.',
      [
        'import pastes the full implementation body at every use.',
        'Header guards are always required around every import.',
        '#include automatically links all object files.',
      ],
      'Textual inclusion can repeat definitions without suitable guards. Named modules expose exported entities through a module dependency; import is not a request to paste the implementation or run the linker.',
      'Ask whether source text is being inserted.',
    );
  }),
  family(3, 'constructor-defaults', 'easy', 'Arguments with defaults', '2–3', (r) => {
    const a = r.int(2, 10),
      b = r.int(2, 9);
    return output(
      `struct Pair {\n  int x, y;\n  Pair(int first = ${a}, int second = ${b}): x{first}, y{second} {}\n};\nint main() { Pair p; std::cout << p.x + p.y; }`,
      a + b,
      `Calling Pair with no arguments uses both defaults (${a}, ${b}); the initialization list puts them in x and y before the body runs.`,
      'An all-defaulted constructor is callable with no arguments.',
    );
  }),
  family(3, 'missing-default', 'medium', 'Which constructor is available?', '3', (r) => {
    const n = r.int(2, 30),
      supplied = r.pick([true, false]);
    return compilation(
      `struct Gauge {\n  int value;\n  explicit Gauge(int n): value{n} {}\n};\nint main() { Gauge g${supplied ? `{${n}}` : ''}; (void)g; }`,
      supplied,
      supplied
        ? 'Direct initialization provides the required int, so the declared constructor can be called.'
        : 'Declaring this constructor prevents an implicit zero-argument constructor from being supplied. Gauge g requires one that does not exist.',
      'Writing any constructor does not preserve an implicit default constructor automatically.',
    );
  }),
  family(3, 'initialization-order', 'hard', 'Declaration order wins', '4', (r) => {
    const a = r.int(2, 8),
      b = a + r.int(1, 5);
    return output(
      `struct Mark {\n  explicit Mark(int n) { std::cout << n << " "; }\n};\nstruct Pair {\n  Mark first, second;\n  Pair(): second{${b}}, first{${a}} {}\n};\nint main() { Pair p; }`,
      `${a} ${b}`,
      `first is declared before second, so construction prints ${a} then ${b}, despite the reversed member initialization list. The body runs after both fields.`,
      'Read the field declarations before the colon list.',
      [`${b} ${a}`, `${a} ${a}`, 'Compile-time error'],
    );
  }),
  family(3, 'mil-needed', 'hard', 'The body is too late', '3–4', (r) => {
    const n = r.int(2, 30),
      mil = r.pick([true, false]);
    return compilation(
      `struct Point {\n  int x;\n  explicit Point(int n): x{n} {}\n};\nstruct Line {\n  Point start;\n  Line()${mil ? `: start{${n}} {}` : ` { start = Point{${n}}; }`}\n};\nint main() { Line line; (void)line; }`,
      mil,
      mil
        ? 'The member initialization list constructs start with its required argument before the Line constructor body.'
        : 'Before the constructor body can run, start needs to be constructed. Point has no default constructor, so later assignment cannot rescue the program.',
      'Initialization happens before body assignment.',
    );
  }),
  family(3, 'const-ref-fields', 'hard', 'Initialize, then use', '4', (r) => {
    const n = r.int(3, 20),
      d = r.int(2, 7);
    return output(
      `struct View {\n  const int id;\n  int &target;\n  View(int n, int &item): id{n}, target{item} {}\n};\nint main() {\n  int item = ${n};\n  View v{${d}, item};\n  v.target += v.id;\n  std::cout << item;\n}`,
      n + d,
      'The const id and reference target are initialized in the MIL. target remains bound to item, so changing through that reference changes item; it does not rebind the reference.',
      'A reference field is an alias, just like a local reference.',
    );
  }),
];
