import { family, output, compilation, question } from './shared';

export const lecture4 = [
  family(4, 'construction-assignment', 'easy', 'New object or existing object?', '1, 4', (r) => {
    const n = r.int(3, 20),
      declaration = r.pick([true, false]);
    return question(
      `// a is an existing object with value ${n}.\n${declaration ? 'Item b = a;' : 'b = a; // b already exists'}`,
      'Which copy operation does this statement request?',
      declaration ? 'Copy construction' : 'Copy assignment',
      [
        declaration ? 'Copy assignment' : 'Copy construction',
        'Only the default constructor',
        'Move construction from a named lvalue',
      ],
      declaration
        ? 'The declaration creates b from the named lvalue a, so this is copy construction. The equals sign inside a declaration does not make it assignment.'
        : 'b already exists. Replacing its value uses copy assignment, which must account for resources b previously owned.',
      'Decide whether the destination object already exists.',
    );
  }),
  family(4, 'shallow-alias', 'medium', 'A pointer copy shares the target', '1–2', (r) => {
    const n = r.int(2, 12),
      d = r.int(2, 8);
    return output(
      `struct Link { int *p; }; // non-owning; no destructor\nint main() {\n  int value = ${n};\n  Link a{&value};\n  Link b = a;\n  *b.p += ${d};\n  std::cout << *a.p;\n}`,
      n + d,
      `Memberwise copying duplicates the stored address. Both non-owning pointers still refer to value, so the mutation is visible through a.p too. No new pointed-to int is created.`,
      'Draw the pointer arrows after the copy.',
    );
  }),
  family(4, 'deep-independent', 'hard', 'An independent allocation', '2', (r) => {
    const n = r.int(2, 12),
      d = r.int(2, 8);
    return output(
      `struct Box {\n  int *p;\n  explicit Box(int n): p{new int{n}} {}\n  Box(const Box &b): p{new int{*b.p}} {}\n  ~Box() { delete p; }\n};\nint main() {\n  Box a{${n}}; Box b{a};\n  *b.p += ${d};\n  std::cout << *a.p << " " << *b.p;\n}`,
      `${n} ${n + d}`,
      'The copy constructor allocates a distinct int initialized from the source value. Updating b’s int does not update a’s; each destructor deletes a different allocation. Assignment is not used in this excerpt.',
      'Look for new in the copy constructor.',
      [`${n + d} ${n + d}`, `${n} ${n}`, 'Guaranteed double-delete crash'],
    );
  }),
  family(4, 'recursive-base', 'medium', 'Stop the recursive copy', '2', (r) => {
    const name = r.pick(['source', 'other', 'from']);
    return question(
      `next{${name}.next ? new Node{*${name}.next} : nullptr}`,
      'What happens at a source node whose next is nullptr?',
      'The copied next is nullptr; recursion stops.',
      [
        'A new node is allocated from address zero.',
        'The source node is deleted.',
        'The entire destination is automatically assigned to the source.',
      ],
      'The conditional operator evaluates only its selected branch. A null source link selects nullptr, preventing dereference and ending the recursion.',
      'For condition ? A : B, a false condition selects B.',
    );
  }),
  family(4, 'explicit', 'medium', 'Make the conversion deliberate', '2–3', (r) => {
    const n = r.int(2, 25),
      direct = r.pick([true, false]);
    return compilation(
      `struct Ticket {\n  explicit Ticket(int n) { (void)n; }\n};\nint main() { Ticket t${direct ? `{${n}}` : ` = ${n}`}; (void)t; }`,
      direct,
      direct
        ? 'Direct initialization explicitly requests construction, so the explicit constructor is eligible.'
        : 'Copy-initialization from an int would require an implicit conversion; explicit excludes this constructor from that conversion.',
      'explicit affects implicit conversions, not whether the class owns memory.',
    );
  }),
  family(4, 'destruction-order', 'hard', 'The body, then the fields', '3', (r) => {
    const a = r.int(2, 8),
      b = a + r.int(2, 5);
    return output(
      `struct Mark {\n  int id;\n  ~Mark() { std::cout << id << " "; }\n};\nstruct Pair {\n  Mark first{${a}}, second{${b}};\n  ~Pair() { std::cout << "P "; }\n};\nint main() { Pair p; }`,
      `P ${b} ${a}`,
      'Pair’s destructor body runs first. Object fields are then destroyed in reverse declaration order: second, then first. Raw pointer fields would not automatically delete pointees.',
      'Reverse the field declaration order after the outer destructor body.',
      [`${a} ${b} P`, `P ${a} ${b}`, `${b} ${a} P`],
    );
  }),
  family(4, 'null-delete', 'easy', 'The chain’s stopping point', '4', (r) => {
    const n = r.int(2, 25);
    return output(
      `int main() {\n  int *p = nullptr;\n  delete p;\n  std::cout << ${n};\n}`,
      n,
      'Deleting a null pointer performs no deallocation and is safe. That is what makes delete next a valid terminating step for the lecture’s recursive destructor.',
      'Deleting nullptr is different from dereferencing nullptr.',
    );
  }),
  family(
    4,
    'assignment-leak',
    'medium',
    'Do not lose the old owner',
    '4–5',
    (r) => {
      const old = r.int(2, 7),
        fresh = old + r.int(1, 5);
      return question(
        `Destination owns a ${old}-node tail.\nnext is overwritten with an independent ${fresh}-node copy.\nNothing kept or released the old tail.`,
        'What resource-management error occurred?',
        `The old ${old}-node tail leaked.`,
        [
          `The source automatically moved into the destination.`,
          `The new ${fresh}-node tail was automatically deleted.`,
          'Copy construction always deletes the old destination.',
        ],
        'Assignment replaces an existing object, so its previous resource needs a cleanup plan. Overwriting its sole owning pointer loses access to that old allocation.',
        'Track the old destination resource as well as the new one.',
      );
    },
    'scenario',
  ),
  family(4, 'self-alias', 'hard', 'Different names, same object', '5', (r) => {
    const n = r.int(2, 20);
    return question(
      `Node node{${n}, new Node{${n + 1}, nullptr}};\nNode *p = &node, *q = &node;\n*p = *q;`,
      'A copy assignment deletes next before copying other.next, with no self-check or temporary. What is the problem?',
      'The source tail is deleted too; copying it then uses freed storage.',
      [
        'p and q guarantee two independent destination objects.',
        'The source is automatically deep-copied before entering the operator.',
        'C++ makes self-assignment a no-op automatically.',
      ],
      'p and q alias the same Node. Deleting the destination tail also destroys the source tail. An early identity check or copy-before-swap avoids reading that freed chain. No output or crash is guaranteed for undefined behavior.',
      'Evaluate this == &other, not whether the expressions are spelled the same.',
    );
  }),
  family(
    4,
    'copy-swap-owner',
    'hard',
    'Where did the old tail go?',
    '5',
    (r) => {
      const old = r.int(2, 6),
        source = old + r.int(1, 5);
      return question(
        `Destination initially owns ${old} tail nodes.\nSource owns ${source} tail nodes.\nNode tmp{source};\nswap(tmp); // swaps destination and tmp\nreturn *this;`,
        'Immediately after swap, who owns the destination’s old tail?',
        'tmp; its destructor releases that tail when the function exits.',
        [
          'The source; copying always transfers its ownership.',
          'Nobody; swap automatically leaked it.',
          'The destination still owns both tails.',
        ],
        'tmp first owns an independent source copy. Swapping gives that copy to the destination and the old destination tail to tmp. tmp’s destructor later releases the old tail, including during safe self-assignment.',
        'Label resources before and after the swap separately.',
      );
    },
    'scenario',
  ),
];
