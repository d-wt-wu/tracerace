import { LIST_CPP, NODE_CPP, COPY_NODE_CPP, ASSIGN_NODE_CPP } from './models';

export type Reading = { lecture: number; pages: string; note?: string };
export type WorkedStep = { text: string; diagram?: string };
export type WorkedExample = {
  code: string;
  steps: WorkedStep[];
  output?: string;
  prelude?: string;
};
export type CourseLesson = {
  id: string;
  title: string;
  objective: string;
  vocabulary: [string, string][];
  reading: Reading[];
  example: WorkedExample;
  families: string[];
  prerequisites: string[];
  day: number;
  minutes: number;
  written?: string;
};
const ids = (lecture: number, ...slugs: string[]) => slugs.map((s) => `b07-l${lecture}-${s}`);
const example = (
  code: string,
  steps: (string | WorkedStep)[],
  output?: string,
  prelude?: string,
): WorkedExample => ({
  code,
  steps: steps.map((s) => (typeof s === 'string' ? { text: s } : s)),
  output,
  prelude,
});
const lesson = (
  id: string,
  title: string,
  objective: string,
  vocabulary: [string, string][],
  reading: Reading[],
  worked: WorkedExample,
  families: string[],
  written?: string,
): CourseLesson => ({
  id,
  title,
  objective,
  vocabulary,
  reading,
  example: worked,
  families,
  prerequisites: [],
  day: 1,
  minutes: 10,
  written,
});

export const CSCB07_LESSONS: CourseLesson[] = [
  lesson(
    'values',
    'Read values and assignments',
    'Trace an integer assignment and distinguish = from ==.',
    [
      ['object', 'A piece of storage with a type and a lifetime.'],
      ['int / bool', 'An integer type / a true-or-false type.'],
      ['= / ==', 'Store a value / compare two values.'],
    ],
    [
      {
        lecture: 1,
        pages: '1–2',
        note: 'Basic-code prerequisite bridge; the beginner guide expands this syntax.',
      },
    ],
    example(
      'int x = 3;\nx = x + 2;\nbool same = (x == 5);\nstd::cout << x << " " << same;',
      [
        {
          text: 'The declaration creates one int named x containing 3.',
          diagram: 'integer object\n[x: 3]',
        },
        'Read the old 3, add 2, then store 5 back in x.',
        '== compares x with 5. It produces true without changing x.',
        'cout prints the int and the bool. Without boolalpha, true prints as 1.',
      ],
      '5 1',
    ),
    ids(1, 'basic-values', 'basic-comparison'),
    'trace-parameters',
  ),
  lesson(
    'functions',
    'Follow a function call',
    'Track an argument, local parameter, and returned result.',
    [
      ['function', 'A named operation called with arguments.'],
      ['parameter', 'The named input inside the function.'],
      ['return / void', 'Supply a result / have no result value.'],
    ],
    [{ lecture: 1, pages: '2–4', note: 'Read with the beginner guide’s basic function primer.' }],
    example(
      'int x = 4;\nint result = twice(x);\nstd::cout << x << " " << result;',
      [
        'x is created with value 4.',
        'Calling twice copies 4 into its int parameter n.',
        'return n * 2 supplies 8 to the caller; result receives 8.',
        'No statement changed x, so output is 4 8. Printing and returning are different actions.',
      ],
      '4 8',
      'int twice(int n) { return n * 2; }',
    ),
    ids(1, 'basic-return', 'basic-void'),
  ),
  lesson(
    'control',
    'Conditions, loops, and scope',
    'Trace a loop one iteration at a time and recognize a shadowed local.',
    [
      ['condition', 'An expression tested as true or false.'],
      ['for', 'Initialize once; test; run the body; increment; repeat.'],
      ['scope', 'Where a name is available; a nested declaration may shadow it.'],
    ],
    [
      {
        lecture: 1,
        pages: '2–4',
        note: 'Prerequisites used in the later List loops; beginner guide p. 2.',
      },
    ],
    example(
      'int total = 0;\nfor (int i = 0; i < 3; ++i) {\n  total += i;\n}\nif (total == 3) std::cout << total;',
      [
        'total starts at 0. The loop creates i with value 0.',
        'For i = 0, add 0: total remains 0.',
        'Increment i to 1; add 1: total becomes 1.',
        'Increment i to 2; add 2: total becomes 3.',
        'i becomes 3; i < 3 is false, so the body stops. The i declared by this loop is out of scope afterward.',
        'The if comparison is true, so cout prints 3.',
      ],
      '3',
    ),
    ids(1, 'basic-branch', 'basic-loop', 'basic-scope'),
  ),
  lesson(
    'structs',
    'Types, objects, and member access',
    'Read a struct and access its fields with . and ->.',
    [
      ['struct', 'A user-defined type grouping fields and possibly methods.'],
      ['field', 'A data member belonging to an object.'],
      ['. / -> / ::', 'Member through an object / through a pointer / scope-qualified name.'],
    ],
    [
      { lecture: 1, pages: '2' },
      { lecture: 2, pages: '4–5' },
    ],
    example(
      'Point a{2, 3};\nPoint b = a;\nPoint *p = &b;\np->x = 8;\nstd::cout << a.x << " " << b.x;',
      [
        'Point names a type; a is one object with fields x=2 and y=3.',
        'b is another Point, initialized by copying the two int fields.',
        {
          text: 'p is a separate pointer object holding the address of b.',
          diagram: '[a: x=2,y=3]\n[b: x=2,y=3] <--- [p: address of b]',
        },
        'p->x means (*p).x. It changes b.x to 8.',
        'a.x is still 2; the output is 2 8.',
      ],
      '2 8',
      'struct Point { int x, y; };',
    ),
    ids(1, 'basic-struct', 'basic-member-pointer'),
  ),
  lesson(
    'references',
    'A value, an alias, and a pointer',
    'Explain why a reference and a pointer can reach the same int without being the same kind of entity.',
    [
      ['int &r', 'Declare r as an alias for an existing int.'],
      ['&x / int *p', 'Take x’s address / declare a pointer object.'],
      ['*p / nullptr', 'Access the pointed-to object / a null pointer value.'],
    ],
    [{ lecture: 1, pages: '2–3' }],
    example(
      'int x = 5;\nint &r = x;\nint *p = &x;\nr = 7;\n*p += 1;\nstd::cout << x;',
      [
        { text: 'x creates one integer object storing 5.', diagram: '[x: 5]' },
        {
          text: 'r is another name for that int; it does not create another int.',
          diagram: 'r names ---> [x: 5]',
        },
        {
          text: 'p is a separate pointer storing x’s address.',
          diagram: '[p: address of x] ---> [x: 5] <--- name r',
        },
        { text: 'Writing r = 7 changes the shared int to 7.', diagram: '[p] ---> [x: 7] <--- r' },
        {
          text: '*p accesses x; adding 1 changes that same int to 8.',
          diagram: '[p] ---> [x: 8] <--- r',
        },
        'The final output is 8. & means reference in a type, address-of in an expression; * means pointer in a type, dereference in an expression.',
      ],
      '8',
    ),
    ids(1, 'alias', 'not-rebound', 'reference-address', 'reference-to-pointer'),
    'trace-parameters',
  ),
  lesson(
    'parameters',
    'Choose how a parameter is passed',
    'Predict whether a call changes the caller and use const references for read-only access.',
    [
      ['by value', 'Initialize a separate parameter object with a copy.'],
      ['by reference', 'Alias the caller’s object.'],
      [
        'const reference',
        'Read without a full object copy or ordinary writes through this access path.',
      ],
    ],
    [{ lecture: 1, pages: '2–4' }],
    example(
      'int x = 5;\nvalue(x);\nreference(x);\npointer(&x);\nstd::cout << x;',
      [
        'x starts at 5.',
        'value increments its local copy; x remains 5.',
        'reference aliases x, so its increment changes x to 6.',
        'pointer receives a copied address, then increments the int at that address: x becomes 7.',
        'Output is 7. A pointer can be passed by value while still permitting access to a caller’s object.',
      ],
      '7',
      'void value(int n) { ++n; }\nvoid reference(int &n) { ++n; }\nvoid pointer(int *n) { ++*n; }',
    ),
    ids(
      1,
      'value-parameter',
      'reference-parameter',
      'literal-binding',
      'const-write',
      'large-parameter',
    ),
    'trace-parameters',
  ),
  lesson(
    'memory',
    'Allocate, release, and track lifetime',
    'Distinguish automatic storage, a dynamic allocation, leaks, and dangling pointers.',
    [
      ['new / delete', 'Create a dynamic object / destroy and deallocate it.'],
      [
        'leak / dangling',
        'Lost access to a live allocation / reference to an object whose lifetime ended.',
      ],
      [
        'undefined behavior',
        'The language supplies no required outcome; neither a value nor a crash is guaranteed.',
      ],
    ],
    [{ lecture: 2, pages: '1–2', note: 'Stop before Testing for this reading.' }],
    example(
      'int *p = new int{8};\nint *q = p;\ndelete p;\np = nullptr;\n// Do not dereference q.',
      [
        {
          text: 'The local pointer and dynamic int have separate lifetimes.',
          diagram: 'automatic [p: A] ---> dynamic [A: int 8]',
        },
        {
          text: 'q copies the address; it does not copy the int.',
          diagram: '[p: A] ---+\n         +---> [A: int 8]\n[q: A] ---+',
        },
        {
          text: 'delete ends the dynamic int’s lifetime exactly once.',
          diagram: '[p: old A]    [A: lifetime ended]\n[q: old A]    dangling; do not dereference',
        },
        'Assigning nullptr changes only p. It does not repair q. Losing the last pointer without delete would instead leak the live allocation.',
        'Match scalar new with delete, and new[] with delete[]. This example is an ownership explanation; no invalid access is executed.',
      ],
    ),
    ids(2, 'matching-delete', 'pointer-lifetime', 'allocation-value'),
    'repair-memory',
  ),
  lesson(
    'methods',
    'Fields, methods, and this',
    'Explain which object a method changes and define a method outside its class.',
    [
      ['method', 'A function called on an object.'],
      ['this', 'A pointer to the receiver object.'],
      ['Type::method', 'A method definition qualified with its class scope.'],
    ],
    [{ lecture: 2, pages: '4–5' }],
    example(
      'Counter a{3}, b{7};\nb.add(2);\nstd::cout << a.value << " " << b.value;',
      [
        'Two Counter objects start at 3 and 7.',
        'During b.add(2), this equals &b.',
        'this->value is b’s field; value is the parameter. The method adds 2 to b’s field.',
        'a remains 3 and b becomes 9, producing 3 9. A free function with the same name does not define a missing Counter member.',
      ],
      '3 9',
      'struct Counter {\n  int value;\n  void add(int value);\n};\nvoid Counter::add(int value) { this->value += value; }',
    ),
    ids(2, 'this', 'method-definition'),
  ),
  lesson(
    'constructors',
    'Constructors and defaults',
    'Choose the constructor that creates an object and recognize a missing default constructor.',
    [
      ['constructor', 'Initializes an object; same name as its type and no return type.'],
      ['default argument', 'An argument value supplied when the caller omits it.'],
      [
        'default constructor',
        'A constructor callable with no arguments; it need not initialize ints automatically.',
      ],
    ],
    [{ lecture: 3, pages: '2–3', note: 'Begin at Constructors and Object Creation.' }],
    example(
      'Counter a{6};\nCounter b;\nstd::cout << a.value << " " << b.value;',
      [
        'a passes 6 to the constructor.',
        'The initialization list gives a.value the value 6 before the body.',
        'b supplies no argument, so start’s default 0 is used.',
        'The output is 6 0. If the constructor required an int without a default, Counter b would not compile.',
      ],
      '6 0',
      'struct Counter {\n  int value;\n  Counter(int start = 0): value{start} {}\n};',
    ),
    ids(3, 'constructor-defaults', 'missing-default'),
  ),
  lesson(
    'initialization',
    'Initialize fields before the body',
    'Use a member initialization list and follow field declaration order.',
    [
      ['MIL', 'The member initialization list after a constructor’s colon.'],
      ['initialization', 'Establish the field’s initial state before the constructor body.'],
      ['declaration order', 'Fields initialize in the order they appear in the class.'],
    ],
    [{ lecture: 3, pages: '3–4' }],
    example(
      'int x = 4;\nView v{3, x};\nv.target += v.id;\nstd::cout << x;',
      [
        'x starts at 4.',
        'The MIL initializes const id with 3 and binds target to x.',
        'The body then runs; it cannot repair an uninitialized reference or const field.',
        'v.target += v.id writes through the bound reference, changing x to 7.',
        'For object fields lacking a default constructor, MIL construction is also necessary; assignment in the body is too late.',
      ],
      '7',
      'struct View {\n  const int id;\n  int &target;\n  View(int n, int &item): id{n}, target{item} {}\n};',
    ),
    ids(3, 'initialization-order', 'mil-needed', 'const-ref-fields'),
    'construction',
  ),
  lesson(
    'destruction',
    'Destruction and owning chains',
    'Order destructor events and explain what raw pointer destruction does not release.',
    [
      ['destructor', 'Cleanup function ~Type() at the end of an object’s lifetime.'],
      ['owning link', 'A link responsible for eventually destroying the pointed-to chain.'],
      [
        'reverse order',
        'Object fields are destroyed in reverse declaration order, after the outer destructor body.',
      ],
    ],
    [{ lecture: 4, pages: '3–4', note: 'Destructor section; leave copying for later lessons.' }],
    example(
      '{ Pair p; }',
      [
        'Pair’s fields first and second already contain IDs 1 and 2.',
        'Leaving the block runs Pair’s destructor body, printing P.',
        'Then second is destroyed, printing 2; first follows, printing 1.',
        {
          text: 'An owning Node destructor delete next recursively destroys a tail; a plain raw pointer field does not do that automatically.',
          diagram:
            '[root owner] --> [owned node] --> [owned node] --> null\ncleanup: delete next, recursively; null ends the chain',
        },
      ],
      'P 2 1',
      'struct Mark {\n  int id; ~Mark() { std::cout << id << " "; }\n};\nstruct Pair {\n  Mark first{1}, second{2};\n  ~Pair() { std::cout << "P "; }\n};',
    ),
    ids(4, 'destruction-order', 'null-delete'),
    'construction',
  ),
  lesson(
    'modules',
    'Compile parts, then link',
    'Identify module roles, declarations/definitions, dependency order, and object files.',
    [
      ['interface / implementation', 'Exported declarations / the module’s function definitions.'],
      ['client', 'A source unit that imports the exported interface.'],
      ['object file / linking', 'Compiled unit / combination of object files into an executable.'],
    ],
    [{ lecture: 3, pages: '1–2' }],
    example(
      '// meter.cc — interface\nexport module meter;\nexport int twice(int);\n\n// meter-impl.cc — separate implementation file\nmodule meter;\nint twice(int n) { return n * 2; }\n\n// main.cc — separate client file\nimport meter;\nint main() { return twice(3) == 6 ? 0 : 1; }',
      [
        'These are three different files. The interface exports the function declaration.',
        'The implementation declares module meter and supplies the body.',
        'The client imports the interface and calls twice.',
        'Compile the interface before its dependants; -c produces object files without a final link. Then link all required objects.',
        'import establishes a module dependency; #include inserts header text. The course’s g++20 command is an environment-specific name.',
      ],
    ),
    ids(
      3,
      'module-role',
      'compile-only',
      'dependency-order',
      'declaration-definition',
      'include-import',
    ),
    'module-files',
  ),
  lesson(
    'specifications',
    'Test the promised behavior',
    'Choose expected results from a specification and distinguish testing from debugging.',
    [
      ['specification', 'The behavior the program is required to provide.'],
      ['oracle', 'The expected result used to check an input.'],
      [
        'black / white / grey box',
        'No implementation knowledge / full knowledge / partial knowledge.',
      ],
    ],
    [{ lecture: 2, pages: '2–4' }],
    example(
      'Specification: true exactly for uppercase D plus five digits.\nInput D00000 -> true\nInput ADMIN99 -> false\n\n// A discovered implementation branch:\nif (s == "ADMIN99") return true;',
      [
        'D00000 meets the six-character specification, including leading zeroes.',
        'ADMIN99 does not start with D followed by exactly five digits, so its correct expected result is false.',
        'Seeing an accepting implementation branch gives a useful white-box-inspired test input, not permission to change the oracle to true.',
        'Testing detects the mismatch. Debugging investigates its cause. Passing other examples does not prove all behavior correct.',
      ],
    ),
    ids(2, 'testing-view', 'specified-oracle', 'test-limit'),
    'test-suite',
  ),
  lesson(
    'test-design',
    'Boundaries and regression tests',
    'Build tests for distinct risks and rerun retained cases after changes.',
    [
      ['edge / corner case', 'A boundary condition / a combination of boundary conditions.'],
      ['regression', 'A change breaks behavior that previously worked.'],
      ['unspecified input', 'The contract supplies no expected result; do not invent one.'],
    ],
    [{ lecture: 2, pages: '3–4' }],
    example(
      'Specification: accept integers 4 through 9, inclusive.\nImplementation: n > 4 && n <= 9\n\nTest 4 -> accept   // implementation wrongly rejects\nTest 5 -> accept\nTest 9 -> accept',
      [
        'The contract includes both boundaries, 4 and 9.',
        'The strict lower comparison incorrectly rejects valid input 4.',
        'Testing only interior values such as 5 misses this defect.',
        'After repairing it, rerun earlier relevant tests and add the boundary regression case. A validCode contract can specify rejection for malformed strings; a different contract may say nothing about invalid input.',
      ],
    ),
    ids(2, 'boundary', 'regression', 'specified-oracle'),
    'test-suite',
  ),
  lesson(
    'copy-start',
    'Copying and the conditional operator',
    'Distinguish construction from assignment and read condition ? A : B before recursive copying.',
    [
      ['copy construction', 'Create a new object from another object of its type.'],
      ['copy assignment', 'Replace the value of an object that already exists.'],
      ['?:', 'Evaluate the condition, then only the selected expression.'],
    ],
    [{ lecture: 4, pages: '1–2, 4' }],
    example(
      'Item a{4};\nItem b = a;\nb.value = 9;\nint answer = (a.value > 5) ? 100 : a.value;\nstd::cout << a.value << " " << answer;',
      [
        'a is an existing Item holding 4.',
        'The declaration creates b by copy construction; b has its own int field.',
        'The assignment changes b’s field only.',
        'a.value > 5 is false. The conditional selects a.value, not 100.',
        'Output is 4 4. Later recursive code uses this conditional to stop safely at a null link.',
      ],
      '4 4',
      'struct Item { int value; };',
    ),
    ids(4, 'construction-assignment', 'recursive-base'),
  ),
  lesson(
    'deep-copy',
    'Give a copy its own nodes',
    'Draw a shallow alias and implement a recursive independent copy.',
    [
      ['shallow copy', 'Copy pointer values; the pointed-to objects remain shared.'],
      ['deep copy', 'Create independent owned objects holding copied values.'],
      ['recursive base case', 'A null link ends the recursive operation without dereferencing it.'],
    ],
    [{ lecture: 4, pages: '1–2' }],
    example(
      'Node a{1, new Node{2, new Node{3}}};\nNode b{a};\nb.next->data = 20;\nstd::cout << a.next->data << " " << b.next->data;',
      [
        {
          text: 'a owns a two-node heap tail. Each link owns the remaining chain.',
          diagram: '[a:1] ---> [heap:2] ---> [heap:3] ---> null',
        },
        {
          text: 'The copy constructor recursively allocates b’s independent tail; a null source link is the stopping case.',
          diagram: '[a:1] ---> [A:2] ---> [B:3]\n[b:1] ---> [C:2] ---> [D:3]',
        },
        {
          text: 'Changing b’s second data value does not reach a’s tail.',
          diagram: '[a:1] ---> [A:2] ---> [B:3]\n[b:1] ---> [C:20] --> [D:3]',
        },
        'Output is 2 20. With only memberwise pointer copying, both roots would reach the same tail, and two owning destructors would be unsafe.',
        'The const Node& parameter reads the source without a copy just to pass the argument. A by-value copy-constructor signature is rejected.',
      ],
      '2 20',
      COPY_NODE_CPP,
    ),
    ids(4, 'shallow-alias', 'deep-independent', 'recursive-base'),
    'deep-copy',
  ),
  lesson(
    'explicit',
    'Require a deliberate conversion',
    'Explain which initializations an explicit constructor permits.',
    [
      [
        'single-argument constructor',
        'A constructor callable with one argument, possibly with other defaults.',
      ],
      ['implicit conversion', 'A conversion selected without an explicit construction request.'],
      ['direct initialization', 'Explicit construction with braces or parentheses.'],
    ],
    [{ lecture: 4, pages: '2–3' }],
    example(
      'Token a{4};\nToken b(7);\n// Token c = 4;  // rejected\nstd::cout << a.value << " " << b.value;',
      [
        'The constructor is marked explicit, so implicit conversion from int to Token is excluded.',
        'Braced direct initialization explicitly requests Token construction; a is permitted.',
        'Parenthesized direct initialization is also permitted; b is permitted.',
        'The commented copy-initialization would require the excluded implicit conversion. The remaining program prints 4 7.',
      ],
      '4 7',
      'struct Token {\n  int value;\n  explicit Token(int n): value{n} {}\n};',
    ),
    ids(4, 'explicit', 'construction-assignment'),
  ),
  lesson(
    'assignment',
    'Replace an owned resource safely',
    'Account for a destination’s old tail when assigning into an existing object.',
    [
      ['destination', 'The existing object being assigned to.'],
      ['old resource', 'What the destination owned before assignment.'],
      ['return *this', 'Return the destination object by reference; it enables chaining.'],
    ],
    [{ lecture: 4, pages: '4–5' }],
    example(
      'Node source{7, new Node{8}};\nNode target{1, new Node{2, new Node{3}}};\ntarget = source;\nsource.next->data = 99;\nstd::cout << target.data << " " << target.next->data;',
      [
        'source and target own different initial tails.',
        'Copy assignment must replace target’s old tail without losing its cleanup responsibility.',
        'The shown copy-and-swap implementation builds an independent copy, exchanges ownership, and releases the old target tail through the temporary.',
        'Changing source afterward leaves target’s copied tail independent. Output is 7 8.',
      ],
      '7 8',
      ASSIGN_NODE_CPP,
    ),
    ids(4, 'assignment-leak', 'construction-assignment', 'copy-swap-owner'),
    'assignment',
  ),
  lesson(
    'self-assignment',
    'Copy first, then swap owners',
    'Trace self-assignment and copy-and-swap without reading released storage.',
    [
      [
        'self-assignment',
        'Source and destination denote the same object, even through different pointer names.',
      ],
      ['temporary', 'A local object whose destructor performs cleanup when it leaves scope.'],
      ['swap', 'Exchange fields so each object takes the other’s previous resource.'],
    ],
    [{ lecture: 4, pages: '5' }],
    example(
      'Node a{1, new Node{2}};\nNode *p = &a, *q = &a;\n*p = *q;\nstd::cout << a.next->data;',
      [
        {
          text: 'Both pointers denote a. Deleting a’s source tail first would make later copying read freed storage.',
          diagram: 'p ---> [a] <--- q\n         |\n      old tail',
        },
        {
          text: 'copy-and-swap first makes tmp an independent copy while a is still intact.',
          diagram: '[a] ---> old tail\n[tmp] -> independent new tail',
        },
        {
          text: 'After swapping, a owns the independent new copy. tmp owns the old tail.',
          diagram: '[a] ---> new tail\n[tmp] -> old tail',
        },
        'On return, tmp’s destructor releases the old tail. a remains safely destructible and output is 2.',
        'An early this == &other guard is another valid self-assignment strategy; the plain copy-and-swap version also works but performs an extra deep copy.',
      ],
      '2',
      ASSIGN_NODE_CPP,
    ),
    ids(4, 'self-alias', 'copy-swap-owner'),
    'assignment',
  ),
  lesson(
    'move-construction',
    'Move ownership, not the lifetime',
    'Recognize eligible rvalue expressions and safely transfer an owned tail.',
    [
      [
        'lvalue / rvalue',
        'Expression categories used in reference binding and overload selection; rvalues are broader than unnamed temporaries.',
      ],
      ['T&&', 'An rvalue reference in this non-template example.'],
      [
        'std::move',
        'A cast making an expression eligible for move overloads; it performs no transfer itself.',
      ],
    ],
    [{ lecture: 5, pages: '1–2' }],
    example(
      'Node source{4, new Node{5}};\nNode target{std::move(source)};\nstd::cout << (source.next == nullptr) << " " << target.next->data;',
      [
        {
          text: 'source owns an existing tail before the move.',
          diagram: '[source] ---> [tail:5]\n[target not constructed]',
        },
        'std::move supplies an eligible expression; the move constructor is the operation that actually transfers the tail pointer.',
        {
          text: 'The constructor clears source.next, so exactly one owner remains.',
          diagram: '[source] ---> null\n[target] ---> [same tail:5]',
        },
        'source still exists and its destructor must be safe. Its scalar data need not become zero. This example prints 1 5.',
        'A result constructed directly through copy elision may make no visible copy/move call; do not invent constructor counts for returned temporaries.',
      ],
      '1 5',
      NODE_CPP,
    ),
    ids(5, 'rvalue-binding', 'move-construction', 'move-is-cast', 'copy-move-overload'),
    'moves',
  ),
  lesson(
    'move-assignment',
    'Move into an existing owner',
    'Explain swap-based move assignment, later cleanup, and the Rule of Five.',
    [
      ['move assignment', 'Replace an existing object using an eligible source.'],
      ['moved-from object', 'Still a live object; its state depends on the operation’s contract.'],
      [
        'Rule of Five',
        'A resource-management design guideline, not a rule that every class hand-writes five functions.',
      ],
    ],
    [{ lecture: 5, pages: '2–3', note: 'Stop before Invariants for this reading.' }],
    example(
      'Node target{1, new Node{2}};\nNode source{7, new Node{8}};\ntarget = std::move(source);\nstd::cout << target.next->data << " " << source.next->data;',
      [
        {
          text: 'Both named objects initially own different tails.',
          diagram: '[target] ---> [old tail:2]\n[source] ---> [incoming:8]',
        },
        {
          text: 'Swapping gives the incoming resource to target and the old target resource to source.',
          diagram: '[target] ---> [incoming:8]\n[source] ---> [old tail:2]',
        },
        'source is named and still alive. Its destructor releases the old tail later at scope exit, so output is 8 2.',
        'If the source were a temporary, its cleanup would occur at the end of the full expression. The swap body is O(1); eventual deletion of an m-node tail is O(m).',
        'For an owning class, design destruction, copy construction/assignment, and move construction/assignment coherently, or explicitly disallow unsupported operations.',
      ],
      '8 2',
      NODE_CPP,
    ),
    ids(5, 'swap-move-assignment', 'rule-five', 'move-construction'),
    'moves',
  ),
  lesson(
    'encapsulation',
    'Protect the chain behind List',
    'State the ownership invariant and use public operations without exposing nodes.',
    [
      ['invariant', 'A condition the implementation relies on holding at its boundaries.'],
      ['private / public', 'Implementation-only access / operations available to clients.'],
      [
        'private nested Node',
        'A representation type hidden inside List; clients receive int references, not owning link pointers.',
      ],
    ],
    [{ lecture: 5, pages: '3–5' }],
    example(
      'List values;\nvalues.addToFront(1);\nvalues.addToFront(2);\nvalues.addToFront(3);\nvalues.ith(1) = 20;\nstd::cout << values.ith(0) << " " << values.ith(1);',
      [
        {
          text: 'An empty List owns no nodes; its private head is null.',
          diagram: '[List.head] ---> null',
        },
        {
          text: 'Each insertion creates a new head pointing to the previous chain.',
          diagram: 'after 1: [1]\nafter 2: [2] -> [1]\nafter 3: [3] -> [2] -> [1]',
        },
        'ith(1) walks one link and returns an int reference. Assignment changes its data to 20 but exposes no next pointer.',
        'Output is 3 20. Valid indexes are required; returned references must not outlive their nodes.',
        'Owned nodes must be dynamically allocated, exclusive, and acyclic. Private links prevent clients from casually introducing stack nodes, shared owned tails, or cycles.',
      ],
      '3 20',
      LIST_CPP,
    ),
    ids(5, 'ownership-invariant', 'visibility-default', 'front-insertion', 'indexed-reference'),
    'list-interface',
  ),
  lesson(
    'iterator',
    'An iterator is a position',
    'Implement dereference, prefix increment, comparison, begin, and end safely.',
    [
      ['iterator', 'A non-owning handle to a position in the sequence.'],
      ['begin / end', 'First position / boundary beyond the last item.'],
      [
        'operator* / operator++ / operator!=',
        'Access the item / advance a link / compare positions.',
      ],
    ],
    [
      {
        lecture: 6,
        pages: '1–3',
        note: 'Only iterator material; stop before System Modelling on p. 3.',
      },
    ],
    example(
      'List values; values.addToFront(2); values.addToFront(3);\nauto it = values.begin();\n++it;\n*it = 9;\nstd::cout << values.ith(0) << " " << values.ith(1);',
      [
        {
          text: 'The list is [3,2]. begin wraps the address of the first node.',
          diagram: 'it ---> [3] ---> [2] ---> null(end)',
        },
        {
          text: 'Prefix increment changes the stored position to its next node and returns *this by Iterator&.',
          diagram: '[3] ---> [2] ---> null\n          ^ it',
        },
        'Dereference returns int&, so assigning through *it changes the second item to 9. Output is 3 9.',
        'Comparison uses node addresses, not stored values. Direct p != other.p also supplies the equality behavior missing from the lecture sketch.',
        'An empty list has equal begin/end positions. Never dereference end or increment the null boundary.',
      ],
      '3 9',
      LIST_CPP,
    ),
    ids(
      6,
      'iterator-advance',
      'position-not-value',
      'empty-range',
      'end-boundary',
      'prefix-return',
      'begin-end',
    ),
    'iterator',
  ),
  lesson(
    'ranges',
    'Use a range and count its work',
    'Mutate through auto& and explain linear versus repeated-index traversal.',
    [
      ['auto', 'Ask the compiler to infer the type; & still changes reference binding.'],
      [
        'range-based for',
        'Use begin/end, comparison, dereference, and increment through a short loop form.',
      ],
      ['O(n) / O(n²)', 'Linear work / quadratic work as list length grows.'],
    ],
    [
      {
        lecture: 6,
        pages: '1–3',
        note: 'End after auto & examples; System Modelling and later topics are excluded.',
      },
    ],
    example(
      'List values; values.addToFront(1); values.addToFront(2);\nfor (auto n : values) n += 5;\nfor (auto &n : values) n *= 2;\nstd::cout << values.ith(0) << " " << values.ith(1);',
      [
        { text: 'Front insertion gives the sequence [2,1].', diagram: '[2] ---> [1] ---> null' },
        'The auto n loop changes local copies. The stored sequence stays [2,1].',
        {
          text: 'The auto& n loop binds to the stored ints, giving [4,2].',
          diagram: '[4] ---> [2] ---> null',
        },
        'Output is 4 2. Iterator traversal retains its position and advances n links including the step to end.',
        'Repeated ith(i) restarts from head: 0+1+...+(n-1)=n(n-1)/2 link advances. With O(1) work per item, these traversals are O(n) and O(n²), respectively.',
      ],
      '4 2',
      LIST_CPP,
    ),
    ids(6, 'range-reference', 'indexed-cost', 'iterator-cost', 'iterator-transfer'),
    'transfer-clamp',
  ),
];

for (let i = 0; i < CSCB07_LESSONS.length; i++) {
  const l = CSCB07_LESSONS[i];
  l.prerequisites = i ? [CSCB07_LESSONS[i - 1].id] : [];
  l.day = i < 7 ? 1 : i < 14 ? 2 : i < 21 ? 3 : 4;
}
export const COURSE_TITLE = 'CSCB07 Midterm: C++ Foundations Through Iterators';
export const COURSE_EXAM_DAY = '2026-11-13';
export const COURSE_SCOPE =
  'Lectures 1–5 and Lecture 6 pp. 1–3 through range-based for and auto &, stopping before System Modelling. This is your reported scope; an official coverage announcement has not been supplied.';
