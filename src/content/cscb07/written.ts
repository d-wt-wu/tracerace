import { COPY_NODE_CPP, ASSIGN_NODE_CPP, NODE_CPP, LIST_CPP } from './models';
import { makeQuestion } from '../bank';

/** Question context only: deliberately omits the operations learners must write. */
export function writtenContext(id: string): string | undefined {
  if (id === 'transfer-count' || id === 'transfer-clamp')
    return `// Supplied interface; do not implement or access the representation.
// List exclusively owns its nodes; copying is disabled.
class List {
public:
  class Iterator {
  public:
    int &operator*() const;
    Iterator &operator++();
    bool operator!=(const Iterator &other) const;
  };
  Iterator begin();
  Iterator end();
};
// begin/end delimit the stored integers. Empty: begin/end are the same position.
// Dereference/increment require a non-end position. Standard headers are available.`;
  if (['deep-copy', 'assignment', 'moves', 'iterator'].includes(id))
    return `// Running representation used by this question:
struct Node {
  int data;
  Node *next;
  Node(int d, Node *n = nullptr): data{d}, next{n} {}
  // next is null or exclusively owns a dynamic, acyclic tail.
  // Destruction recursively releases the owned tail.
  // Supply the requested special members; they are omitted here.
};
// For copy assignment, assume a correct deep-copy constructor and destructor.
// For the iterator task, Iterator is nested in List; List has Node *head.
// Standard C++20 headers, including <utility>, are available.`;
  return undefined;
}

export type WrittenTask = {
  id: string;
  title: string;
  lesson: string;
  minutes: number;
  prompt: string;
  code: string;
  worked: string;
  gaps: string;
  solution: string;
  rubric: string[];
  check?: { prelude?: string; body: string; output: string };
};
export const WRITTEN_TASKS: WrittenTask[] = [
  {
    id: 'trace-parameters',
    title: 'Trace a caller and its aliases',
    lesson: 'parameters',
    minutes: 15,
    prompt:
      'On paper, give the final output and the caller’s value after each call. Draw the integer, reference, and pointer separately. Then write a function that adds 4 to a caller’s int.',
    code: 'void local(int n) { n += 10; }\nvoid alias(int &n) { n += 3; }\nvoid address(int *n) { *n *= 2; }\nint x = 4; int &r = x;\nlocal(x); alias(r); address(&x);\nstd::cout << x << " " << r;',
    worked:
      'Starting with x=2: local(x) changes a copy, so x=2. alias(x) makes x=5. address(&x) makes x=10. r always names x. To mutate through a reference: void addOne(int &n) { ++n; }',
    gaps: 'void addFour(_____ n) { n += _____; }\n// after local: x = ___\n// after alias: x = ___\n// after address: x = ___',
    solution:
      'x is 4, then 7, then 14. The final output is 14 14. r aliases x; the pointer parameter stores &x but is a separate pointer object.\n\nvoid addFour(int &n) { n += 4; }',
    rubric: [
      'Value call leaves x=4; reference makes 7; pointer makes 14.',
      'Diagram distinguishes one int, an alias, and a pointer storing its address.',
      'Function uses int& (or a clearly stated valid pointer interface) and mutates the caller.',
      'Explain & as reference/address-of and * as pointer/dereference by context.',
    ],
    check: {
      prelude:
        'void local(int n) { n += 10; }\nvoid alias(int &n) { n += 3; }\nvoid address(int *n) { *n *= 2; }',
      body: 'int x=4; int &r=x; local(x); alias(r); address(&x); std::cout << x << " " << r;',
      output: '14 14',
    },
  },
  {
    id: 'repair-memory',
    title: 'Repair lifetime and ownership errors',
    lesson: 'memory',
    minutes: 20,
    prompt:
      'The fragments are independent. Identify the first invalid operation or leak, explain ownership, and repair it. Undefined behavior has no guaranteed output or crash.',
    code: '// A\nint *p = new int{9}; int *q = p;\ndelete p; std::cout << *q;\n// B\nint *a = new int[4]{1,2,3,4}; delete a;\n// C\nvoid work() { int *p = new int{9}; }',
    worked:
      'For int *p = new int{6}; delete p;, p is local and the int is dynamic. After delete, setting p=nullptr changes that pointer only. A second alias still dangles.',
    gaps: '// A: read before _____ and delete exactly _____\n// B: _____[] a;\n// C: _____ p; before leaving scope',
    solution:
      'A: q dangles after delete p; *q is undefined behavior. Read before deletion or create an independent value; delete the allocation once. Setting only p=nullptr does not repair q.\nB: new[] requires delete[] a.\nC: the sole pointer disappears while its int remains allocated, so the int leaks; delete p before return. An owning Node must not delete a stack node, share an owned tail, or form a cycle.',
    rubric: [
      'Identify use-after-free, array-delete mismatch, and leak separately.',
      'Repairs preserve exactly one cleanup responsibility per allocation.',
      'Do not claim a fixed output/crash for undefined behavior.',
      'Explain why a raw pointer leaving scope does not delete its pointee.',
    ],
  },
  {
    id: 'construction',
    title: 'Initialization and destruction on paper',
    lesson: 'initialization',
    minutes: 20,
    prompt:
      'Give the token order, explain it, then repair View’s constructor so its const and reference fields are initialized correctly.',
    code: 'struct Mark { int n; Mark(int n): n{n} { std::cout<<"C"<<n<<" "; }\n  ~Mark() { std::cout<<"D"<<n<<" "; } };\nstruct Pair { Mark first, second;\n  Pair(): second{7}, first{4} { std::cout<<"P "; }\n  ~Pair() { std::cout<<"~P "; } };\n// one scope contains: Pair pair;\nstruct View { const int id; int &target;\n  View(int n, int &item) { /* repair this */ } };',
    worked:
      'Fields a then b construct in declaration order and destruct in reverse, regardless of MIL order. A containing destructor body runs before its fields’ destructors.',
    gaps: 'View(int n, int &item): id{_____}, target{_____} {}\n// token order: __________________',
    solution:
      'C4 C7 P ~P D7 D4\n\nView(int n, int &item): id{n}, target{item} {}\n\nThe fields initialize before the constructor body. A const field needs an initializer; assigning to a reference would mutate its referent, not bind it. Reordering the MIL does not reorder field construction.',
    rubric: [
      'Construction C4 C7 precedes the Pair body.',
      'The outer destructor ~P precedes D7 D4.',
      'Use an MIL for id and target; the parameter names may differ.',
      'Explain why body assignment cannot replace missing field construction.',
    ],
    check: {
      prelude:
        'struct Mark { int n; Mark(int n):n{n}{ std::cout<<"C"<<n<<" "; } ~Mark(){ std::cout<<"D"<<n<<" "; } };\nstruct Pair { Mark first,second; Pair():second{7},first{4}{std::cout<<"P ";} ~Pair(){std::cout<<"~P ";} };',
      body: '{ Pair pair; }',
      output: 'C4 C7 P ~P D7 D4',
    },
  },
  {
    id: 'module-files',
    title: 'Write a three-file module',
    lesson: 'modules',
    minutes: 20,
    prompt:
      'Write an interface, implementation, and client for module score. Export struct Score{int value;} and int doubled(const Score&). The client checks that Score{6} doubles to 12. Give dependency-valid compile and link steps.',
    code: '// score.cc\n// score-impl.cc\n// main.cc\n// These are three separate files.',
    worked:
      'Interface begins export module name; and exports declarations. Implementation begins module name; and supplies bodies. Client begins import name;. Compile dependencies before dependants, then link objects.',
    gaps: '// interface\n_____ module score;\nexport struct Score { int value; };\nexport int doubled(const Score &);\n// implementation\n_____ score;\nint doubled(const Score &s) { return _____; }\n// client\n_____ score;',
    solution:
      '// score.cc\nexport module score;\nexport struct Score { int value; };\nexport int doubled(const Score &s);\n\n// score-impl.cc\nmodule score;\nint doubled(const Score &s) { return s.value * 2; }\n\n// main.cc\nimport score;\nint main() { Score s{6}; return doubled(s) == 12 ? 0 : 1; }\n\n// course environment commands\ng++20 -c score.cc\ng++20 -c score-impl.cc\ng++20 -c main.cc\ng++20 score.o score-impl.o main.o -o main\n\n-c compiles without linking; g++20 is the course environment’s command, not a universal local alias. A method definition would use Type::method.',
    rubric: [
      'Separate interface/implementation/client, using the correct module opening for each.',
      'Export the client-visible type and function declaration; put one function definition in the implementation.',
      'Client imports the module and checks the requested value.',
      'Compile the interface before dependants and link the required object files. Equivalent dependency-valid commands are acceptable.',
    ],
  },
  {
    id: 'test-suite',
    title: 'Invent a specification-based test suite',
    lesson: 'test-design',
    minutes: 20,
    prompt:
      'validCode returns true exactly for uppercase D followed by five decimal digits; all other strings return false. Write eight tests and explain each risk. Add a test for an implementation’s special ADMIN99 branch. Contrast this contract with an integer-sum program that says nothing about non-integer input.',
    code: 'bool validCode(const std::string &s);\n// discovered implementation bug:\nif (s == "ADMIN99") return true;',
    worked:
      'D00000 -> true tests leading zeroes. D1234 -> false tests a short input. Both expected results come from the contract, not from running a possibly wrong implementation.',
    gaps: 'Input          Expected      Risk\nD00000         _____         leading zeroes\nD1234          _____         length below boundary\nADMIN99        _____         hidden accepting branch\n// add your own distinct cases',
    solution:
      'Examples: D12345 true; D00000 true; X12345 false; D1234 false; D123456 false; DA2345 false; D1234A false; empty string false. Other tests targeting the same distinct risks are valid. ADMIN99 must be false: implementation knowledge suggests the input, not its correct result. For the different integer-sum specification, do not invent an error oracle for non-integers. Rerun relevant retained tests after changes; testing detects a mismatch and debugging locates its cause.',
    rubric: [
      'At least eight distinct input/result pairs follow the exact contract.',
      'Cover valid, leading-zero, prefix, short/long, early/late digit, and empty cases.',
      'ADMIN99 is false; the buggy branch is not an oracle.',
      'Explain boundaries, regression, and why an unspecified integer-sum response is different.',
    ],
    check: {
      prelude:
        "bool validCode(const std::string &s){ if(s.size()!=6||s[0]!='D')return false; for(int i=1;i<6;++i)if(s[i]<'0'||s[i]>'9')return false;return true; }",
      body: 'std::cout<<validCode("D12345")<<validCode("D00000")<<validCode("X12345")<<validCode("D1234")<<validCode("D123456")<<validCode("DA2345")<<validCode("D1234A")<<validCode("")<<validCode("ADMIN99");',
      output: '110000000',
    },
  },
  {
    id: 'deep-copy',
    title: 'Write and draw a recursive copy',
    lesson: 'deep-copy',
    minutes: 20,
    prompt:
      'An owning Node recursively deletes next. Draw a shallow copy and explain why it is unsafe at scope exit. Write the recursive deep-copy constructor. Deep-copy [2,5,8], then change the copy’s second item to 40; give both chains.',
    code: 'struct Node {\n  int data; Node *next;\n  explicit Node(int d, Node *n=nullptr): data{d}, next{n} {}\n  ~Node() { delete next; }\n  // write the copy constructor\n};',
    worked:
      'At a null source link, the new next is null. Otherwise allocate a new Node copied from *other.next; that smaller copy repeats the same rule.',
    gaps: 'Node(const Node &other):\n  data{_____},\n  next{other.next ? new Node{_____} : _____} {}',
    solution:
      COPY_NODE_CPP +
      '\n\nOriginal: [2,5,8]. Copy after mutation: [2,40,8]. The roots and both tail chains are independent. A shallow pointer copy shares the tail, so two owning destructors would attempt to release the same nodes. The const-reference parameter avoids a copy to pass the source; a by-value copy-constructor signature is rejected. Iterative independent-copy implementations are also valid if ownership and cleanup are correct.',
    rubric: [
      'Copy each data value into independently allocated tail nodes.',
      'Handle a null source link without dereferencing it.',
      'Take the source by const reference and leave it unchanged.',
      'Diagram independent ownership; explain shared-tail double-deletion risk.',
    ],
    check: {
      prelude: COPY_NODE_CPP,
      body: 'Node a{2,new Node{5,new Node{8}}};Node b{a};b.next->data=40;std::cout<<a.next->data<<" "<<b.next->data;',
      output: '5 40',
    },
  },
  {
    id: 'assignment',
    title: 'Repair assignment and self-assignment',
    lesson: 'self-assignment',
    minutes: 20,
    prompt:
      'Write a safe copy assignment for the owning Node, using copy-and-swap or another justified strategy. Explain a=a and *p=*q when both pointers alias the same object. Account for the old destination tail and return type.',
    code: 'Node &operator=(const Node &other) {\n  data = other.data;\n  next = other.next ? new Node{*other.next} : nullptr;\n  return *this;\n} // the old tail leaks',
    worked:
      'With target [1,2] and source [7,8,9], a temporary first owns an independent [7,8,9]. After swap, target owns that copy and tmp owns [1,2]. Destroying tmp frees the old target tail.',
    gaps: 'void swap(Node &o) { std::swap(data,o.data); std::swap(next,o.next); }\nNode &operator=(const Node &other) {\n  Node tmp{_____};\n  swap(_____);\n  return _____;\n}',
    solution:
      ASSIGN_NODE_CPP +
      '\n\nThe temporary is copied before the destination changes. Swapping transfers the old destination resource to the temporary, whose destructor releases it at function exit. This also handles self-assignment. Node& and return *this return the destination by reference, enabling chaining without a returned copy. An early identity guard plus a correct cleanup/copy strategy is another valid course-level answer under the stated allocation assumptions.',
    rubric: [
      'No leaked old tail; no shared ownership introduced.',
      'Self-assignment through identical or aliased expressions is safe.',
      'Return the destination by Node&; explain *this.',
      'Supply independence and unequal-length/self-assignment tests.',
    ],
    check: {
      prelude: ASSIGN_NODE_CPP,
      body: 'Node a{1,new Node{2}};Node b{7,new Node{8,new Node{9}}};a=b;a=a;b.next->data=99;std::cout<<a.data<<" "<<a.next->data<<" "<<a.next->next->data;',
      output: '7 8 9',
    },
  },
  {
    id: 'moves',
    title: 'Write moves and the Big Five',
    lesson: 'move-assignment',
    minutes: 20,
    prompt:
      'Write the five resource-management signatures for Node, then a move constructor and swap-based move assignment. For named target [1,2] and source [7,8], trace target=std::move(source) and state when the old target resource is released.',
    code: 'Node target{1,new Node{2}};\nNode source{7,new Node{8}};\ntarget = std::move(source);\n// both objects remain in scope here',
    worked:
      'Move construction has no old destination tail. It can take the pointer then clear the source pointer. Move assignment must also account for the old destination tail; swapping hands that tail to the source.',
    gaps: 'Node(Node &&o): data{o.data}, next{_____} { o.next = _____; }\nNode &operator=(Node &&o) {\n  std::swap(data,o.data); std::swap(next,o.next);\n  return _____;\n}',
    solution:
      NODE_CPP +
      '\n\nAfter named-source swap assignment, target is [7,8] and source owns [1,2]. The old target resource is released when source is later destroyed, not automatically during swap. If the source is a temporary its destructor runs at the full-expression boundary. The source must remain safely destructible. std::move is a cast; the selected operation performs the transfer. Returned temporaries can be elided, so no unstated constructor-count claims are made.',
    rubric: [
      'Correct const& copy and && move signatures, destructor, and reference assignment returns.',
      'Move construction clears the transferred owning link in the source.',
      'Move assignment accounts for old destination resources and safe destruction.',
      'Distinguish named-source lifetime, temporary lifetime, and possible copy elision.',
    ],
    check: {
      prelude: NODE_CPP,
      body: 'Node a{1,new Node{2}};Node b{7,new Node{8}};a=std::move(b);std::cout<<a.next->data<<" "<<b.next->data;',
      output: '8 2',
    },
  },
  {
    id: 'list-interface',
    title: 'Hide the owning representation',
    lesson: 'encapsulation',
    minutes: 15,
    prompt:
      'Sketch a List with a private nested Node and head pointer, public front insertion, int& ith(int), and cleanup. State the exclusive acyclic ownership invariant and the index/reference lifetime preconditions. Assume this List is not copied or moved.',
    code: 'class List {\n  // private representation\npublic:\n  void addToFront(int n);\n  int &ith(int i);\n  ~List();\n};',
    worked:
      'Front insertion allocates Node{n, head}, then head takes that new pointer. Returning int& exposes an item’s data, not its owning next link.',
    gaps: 'void addToFront(int n) { head = new Node{_____, _____}; }\n~List() { delete _____; }\n// invariant: __________________',
    solution:
      LIST_CPP +
      '\n\nThe nodes and head are private. Every owned link is null or owns an exclusive dynamically allocated next node; tails are not shared and the chain has no cycles. ith requires a valid index and returned references must not outlive their nodes. The model explicitly disables copying; its iterator operations are supplied for later use.',
    rubric: [
      'Private nested Node/head and initialized empty head.',
      'Front insertion preserves the old chain and cleanup deletes it once.',
      'Invariant rules out stack ownership, shared owned tails, and cycles.',
      'State valid-index and returned-reference lifetime requirements.',
    ],
    check: {
      prelude: LIST_CPP,
      body: 'List xs;xs.addToFront(1);xs.addToFront(2);xs.addToFront(3);xs.ith(1)=20;std::cout<<xs.ith(0)<<" "<<xs.ith(1);',
      output: '3 20',
    },
  },
  {
    id: 'iterator',
    title: 'Complete the iterator',
    lesson: 'iterator',
    minutes: 20,
    prompt:
      'Implement begin/end, dereference, prefix increment, and inequality. Compare positions directly; the lecture sketch does not provide the == it uses. Explain empty lists and why dereferencing/incrementing end is invalid.',
    code: 'class Iterator {\n  Node *p;\npublic:\n  explicit Iterator(Node *n): p{n} {}\n  int &operator*() { /* TODO */ }\n  Iterator &operator++() { /* TODO */ }\n  bool operator!=(const Iterator &o) const { /* TODO */ }\n};',
    worked:
      'At [3,2], begin stores the first node’s address. ++ follows one next link. * returns the current int by reference. End wraps nullptr and has no item.',
    gaps: 'int &operator*() { return _____; }\nIterator &operator++() { p = _____; return _____; }\nbool operator!=(const Iterator &o) const { return _____; }\nIterator begin() { return Iterator{_____}; }\nIterator end() { return Iterator{_____}; }',
    solution:
      LIST_CPP +
      '\n\n* returns p->data by int&; ++ stores p->next and returns *this by Iterator&; != compares p != o.p. begin wraps head and end wraps nullptr. Two positions holding equal data still differ. A guarded empty loop runs zero times; end must not be dereferenced or advanced.',
    rubric: [
      'Return the stored int by reference; prefix increment returns this iterator by reference.',
      'Compare node positions, not data values; supply == if using it.',
      'begin wraps head; end wraps nullptr; empty begin/end coincide.',
      'No ownership/deletion in iterator operations; explain end preconditions.',
    ],
    check: {
      prelude: LIST_CPP,
      body: 'List xs;xs.addToFront(5);xs.addToFront(5);auto a=xs.begin();auto b=a;++b;std::cout<<(a!=b);',
      output: '1',
    },
  },
  {
    id: 'transfer-count',
    title: 'Count with only public iteration',
    lesson: 'ranges',
    minutes: 20,
    prompt:
      'Write int countAbove(List &values, int limit). Count entries strictly greater than limit, without exposing nodes, copying the owning List, or repeatedly indexing. State time/space costs and test empty, equality, and repeated values.',
    code: 'int countAbove(List &values, int limit) {\n  // public iterator operations only\n}',
    worked:
      'For values [2,5,5] and limit 3, start count at 0; 2 does not count, then each 5 increments it. Result 2. Strictly greater means equality is excluded.',
    gaps: 'int countAbove(List &values, int limit) {\n  int count = 0;\n  for (auto it = ____; it != ____; ++it)\n    if (____ > limit) ++count;\n  return count;\n}',
    solution:
      'int countAbove(List &values, int limit) {\n  int count = 0;\n  for (auto it = values.begin(); it != values.end(); ++it)\n    if (*it > limit) ++count;\n  return count;\n}\n\nTime O(n), extra space O(1). A range-based loop is also valid. Empty -> 0; [5], limit5 -> 0; [6,6], limit5 -> 2. Passing List& avoids copying; its supplied begin/end are non-const even though this task does not modify the values.',
    rubric: [
      'Visit through the public iterator interface and use strict >.',
      'Count repeated matching positions independently; empty returns zero.',
      'No node access, List copy, or restarted ith walks.',
      'Justify O(n) time and O(1) extra space; equivalent range-based code is valid.',
    ],
    check: {
      prelude:
        LIST_CPP +
        '\nint countAbove(List &xs,int k){int n=0;for(auto it=xs.begin();it!=xs.end();++it)if(*it>k)++n;return n;}',
      body: 'List xs;xs.addToFront(5);xs.addToFront(5);xs.addToFront(2);std::cout<<countAbove(xs,3);',
      output: '2',
    },
  },
  {
    id: 'transfer-clamp',
    title: 'Mutate data without changing ownership',
    lesson: 'ranges',
    minutes: 20,
    prompt:
      'Write int clampToMinimum(List &values, int minimum). Replace each value below minimum with minimum, and return how many entries changed. Use the public iterator interface; keep nodes, links, and ownership intact.',
    code: 'int clampToMinimum(List &values, int minimum) {\n  // return the number of changed stored integers\n}',
    worked:
      'For [-2,0,-2] with minimum 0, the two -2 entries change and the equal 0 does not. The sequence becomes [0,0,0], changed count 2.',
    gaps: 'int changed = 0;\nfor (auto it = values.begin(); it != values.end(); ++it) {\n  if (_____ < minimum) {\n    _____ = minimum;\n    ++changed;\n  }\n}\nreturn changed;',
    solution:
      'int clampToMinimum(List &values, int minimum) {\n  int changed = 0;\n  for (auto it = values.begin(); it != values.end(); ++it) {\n    if (*it < minimum) { *it = minimum; ++changed; }\n  }\n  return changed;\n}\n\nA range-based loop with auto& is equally valid. Time O(n), extra space O(1). [] -> unchanged,count0; [5] with min5 -> [5],0; [4] with min5 -> [5],1; [6] -> [6],0; [-2,0,-2] with min0 -> [0,0,0],2. Only int data changes; no links or lifetimes change.',
    rubric: [
      'Mutate stored data through a reference/dereferenced iterator.',
      'Use strict < and increment only when a value changes.',
      'Cover empty, equal, below/above, negative, and repeated values.',
      'Keep ownership/links intact; justify O(n) time and O(1) space.',
    ],
    check: {
      prelude:
        LIST_CPP +
        '\nint clampToMinimum(List &xs,int k){int n=0;for(auto &v:xs)if(v<k){v=k;++n;}return n;}',
      body: 'List xs;xs.addToFront(-2);xs.addToFront(0);xs.addToFront(-2);std::cout<<clampToMinimum(xs,0)<<" "<<xs.ith(0)<<" "<<xs.ith(1)<<" "<<xs.ith(2);',
      output: '2 0 0 0',
    },
  },
];

export type PaperProblem = {
  id: string;
  title: string;
  prompt: string;
  code: string;
  solution: string;
  rubric: string[];
  autoExpected?: string;
  lesson: string;
};
export function paperProblems(set: 'a' | 'b'): PaperProblem[] {
  const seed = set === 'a' ? 1741 : 8702;
  const templates: [string, string, string][] = [
    [
      'b07-l1-not-rebound',
      'references',
      'Trace the names and give the final output. Explain whether the reference rebinds.',
    ],
    [
      'b07-l2-matching-delete',
      'memory',
      'Supply the cleanup statement and explain what goes wrong with the mismatched alternative.',
    ],
    [
      'b07-l4-destruction-order',
      'destruction',
      'Give the exact output tokens and justify the destruction order.',
    ],
    [
      'b07-l3-module-role',
      'modules',
      'Write the line, explain this file’s role, and give dependency-valid build stages.',
    ],
  ];
  const result: PaperProblem[] = templates.map(([family, lesson, prompt], i) => {
    const q = makeQuestion(family, seed + i);
    return {
      id: 'p' + i,
      title: q.title,
      prompt,
      code: q.code,
      solution: q.expected + '\n\n' + q.explanation,
      rubric: [
        'Give the correct requested result.',
        'Explain the relevant rule, not just the final token.',
        'State any lifetime or build preconditions.',
      ],
      autoExpected: /^-?\d+(\s+-?\d+)*$/.test(q.expected) ? q.expected : undefined,
      lesson,
    };
  });
  for (const id of [
    'test-suite',
    'assignment',
    'moves',
    set === 'a' ? 'transfer-count' : 'transfer-clamp',
  ]) {
    const task = WRITTEN_TASKS.find((t) => t.id === id)!;
    if (set === 'b' && id === 'test-suite') {
      result.push({
        id,
        title: 'A new specification, a fresh test suite',
        lesson: 'test-design',
        prompt:
          'A validator accepts integers from 4 through 9 inclusive, and rejects every other integer. Design tests for both boundaries, neighboring rejected values, an interior value, and a negative value. Explain what an implementation using n > 4 gets wrong and how you would retain tests after fixing it.',
        code: 'bool valid(int n);\n// required acceptance set: {4,5,6,7,8,9}',
        solution:
          'Examples: 3 false; 4 true; 5 true; 8 true; 9 true; 10 false; -1 false. The strict lower comparison rejects valid input 4. Expected results follow the contract, not the implementation. Keep the boundary case and rerun relevant existing tests after the fix.',
        rubric: [
          'Include both accepted boundaries and the immediately adjacent rejected values.',
          'Use the new integer contract consistently; equivalent distinct cases are valid.',
          'Identify the incorrect strict lower comparison.',
          'Explain regression testing and the distinction between finding a mismatch and debugging it.',
        ],
      });
      continue;
    }
    if (set === 'b' && id === 'assignment') {
      result.push({
        id,
        title: 'Assignment to an empty tail, then aliasing',
        lesson: 'self-assignment',
        prompt:
          'Node has an owning next link, a correct recursive copy constructor, and destructor delete next. Write copy assignment. Assign the one-node source [9] into destination [2,4,6]. Then perform *p=*q where both pointers address the destination. Give the final chain and explain cleanup and self-aliasing.',
        code: 'Node source{9};\nNode destination{2,new Node{4,new Node{6}}};\ndestination = source;\nNode *p=&destination, *q=&destination;\n*p = *q;',
        solution:
          ASSIGN_NODE_CPP +
          '\n\nDestination ends as [9] with next==nullptr. Its old two-node tail must be released. Copy-and-swap copies before modifying the source/destination, then gives the old tail to the temporary for cleanup. Self-aliasing remains safe; the source [9] stays unchanged. A justified guarded implementation is also acceptable under the stated allocation assumptions.',
        rubric: [
          'Release the old destination tail without losing it.',
          'Copy an empty tail as nullptr, leaving destination [9].',
          'Handle pointer-alias self-assignment safely.',
          'Return a reference to the destination and preserve source independence.',
        ],
      });
      continue;
    }
    if (set === 'b' && id === 'moves') {
      result.push({
        id,
        title: 'Move construction and the surviving source',
        lesson: 'move-construction',
        prompt:
          'Write the move constructor for the owning Node. Trace the named source and destination below. Explain why the source still exists, what must be cleared, and why calling std::move alone would not transfer anything. State the other four special-member signatures.',
        code: 'Node source{6,new Node{12,new Node{18}}};\nNode moved{std::move(source)};\n// source is still in scope',
        solution:
          NODE_CPP +
          '\n\nmoved owns [6,12,18] using the existing tail. The source remains alive with source.next==nullptr and safely destructible; its scalar data remains 6 in this implementation. Clearing source.next prevents its destructor from deleting the transferred tail. std::move only produces an eligible expression. This named-source initialization avoids assumptions about returned-temporary elision.',
        rubric: [
          'Transfer the existing tail without deep-copying it.',
          'Clear the source owning pointer and keep the source safely destructible.',
          'Explain the cast versus the actual move operation.',
          'Supply correct destructor/copy/move assignment signatures with reference returns.',
        ],
      });
      continue;
    }
    result.push({
      id,
      title: task.title,
      prompt:
        task.prompt +
        (set === 'b'
          ? '\nUse different values and list lengths from your earlier practice, and justify each boundary case.'
          : ''),
      code: task.code,
      solution: task.solution,
      rubric: task.rubric,
      lesson: task.lesson,
    });
  }
  return result;
}
