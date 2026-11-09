import { family, output, compilation, question } from './shared';
import { LIST_CPP, NODE_CPP } from './models';

export const lecture5 = [
  family(5, 'rvalue-binding', 'medium', 'An eligible rvalue argument', '1', (r) => {
    const n = r.int(2, 30),
      moved = r.pick([true, false]);
    return compilation(
      `int main() {\n  int n = ${n};\n  int &&ref = ${moved ? 'std::move(n)' : 'n'};\n  (void)ref;\n}`,
      moved,
      moved
        ? 'std::move casts n to an xvalue expression, which can bind to this rvalue reference. The named int object still exists.'
        : 'The expression n is a named lvalue. It cannot bind directly to this int&&. Not all rvalues are unnamed temporary objects.',
      'Value category describes an expression, not whether an object has vanished.',
    );
  }),
  family(5, 'move-construction', 'hard', 'Transfer the tail, keep the source safe', '1–2', (r) => {
    const n = r.int(3, 20),
      tail = n + r.int(2, 7);
    return output(
      `${NODE_CPP}\nint main() {\n  Node source{${n}, new Node{${tail}}};\n  Node target{std::move(source)};\n  std::cout << (source.next == nullptr) << " " << target.next->data;\n}`,
      `1 ${tail}`,
      'This move constructor transfers the existing next pointer and clears source.next. The source object still exists and is safely destructible. Its scalar data is not required to become zero.',
      'Which object owns the existing tail after the constructor?',
      [`0 ${tail}`, `1 ${n}`, 'The source is already destroyed'],
    );
  }),
  family(5, 'move-is-cast', 'medium', 'std::move does not move by itself', '1–2', (r) => {
    const n = r.int(3, 30);
    return output(
      `struct Item { int value; };\nint main() {\n  Item item{${n}};\n  (void)std::move(item);\n  std::cout << item.value;\n}`,
      n,
      'std::move changes the expression’s value category. No constructor or assignment is invoked here, so it does not clear the object, transfer a resource, or destroy it.',
      'An eligible expression still needs an operation that actually consumes it.',
    );
  }),
  family(5, 'copy-move-overload', 'medium', 'Choose the relevant overload', '1–3', (r) => {
    const moved = r.pick([true, false]),
      n = r.int(3, 30);
    return output(
      `struct Item {\n  Item() = default;\n  Item(const Item &) { std::cout << "copy"; }\n  Item(Item &&) { std::cout << "move"; }\n};\nint main() {\n  Item first; // case ${n}\n  Item second{${moved ? 'std::move(first)' : 'first'}};\n}`,
      moved ? 'move' : 'copy',
      moved
        ? 'The explicitly cast named object supplies an eligible rvalue expression, so Item(Item&&) is selected. No return-value/copy-elision counting is involved.'
        : 'first is a named lvalue, so the const-reference copy constructor is selected. The fact that a move overload exists does not make every copy a move.',
      'This example deliberately uses a named source to avoid return-value elision ambiguity.',
      [moved ? 'copy' : 'move', 'copy move', 'No constructor call is required here'],
    );
  }),
  family(5, 'swap-move-assignment', 'hard', 'The source receives the old resource', '2–3', (r) => {
    const a = r.int(2, 10),
      b = a + r.int(2, 8);
    return output(
      `${NODE_CPP}\nint main() {\n  Node target{0, new Node{${a}}};\n  Node source{0, new Node{${b}}};\n  target = std::move(source);\n  std::cout << target.next->data << " " << source.next->data;\n}`,
      `${b} ${a}`,
      'Swap-based move assignment gives the source tail to target and target’s old tail to source. source is a named live object here: its destructor releases that old tail later at scope exit, not immediately during swap.',
      'Do not assume that every moved-from source is a temporary or becomes empty.',
      [`${b} ${b}`, `${a} ${b}`, 'The source must be nullptr'],
    );
  }),
  family(
    5,
    'rule-five',
    'easy',
    'A resource-management guideline',
    '3',
    (r) => {
      const name = r.pick(['Buffer', 'Image', 'Chain']),
        n = r.int(2, 20);
      return question(
        `${name} exclusively owns ${n} dynamically allocated objects.\nIts default pointer copying would duplicate ownership.`,
        'What does the Rule of Five suggest?',
        'Design coherent destruction, copy construction/assignment, and move construction/assignment.',
        [
          'Every C++ class must manually define five functions.',
          'Declare five raw pointers to make copying safe.',
          'A move means destructors are unnecessary.',
        ],
        'An owning resource often needs a coherent policy for all five special operations (possibly deleting some). This is a design guideline, not a requirement for ordinary classes whose fields already manage themselves.',
        'Ownership, not the number of fields, is the reason to examine these functions.',
      );
    },
    'scenario',
  ),
  family(
    5,
    'ownership-invariant',
    'hard',
    'A valid link is more than a non-null link',
    '3–5',
    (r) => {
      const n = r.int(2, 20);
      return question(
        `An owning Node destructor executes delete next.\nA client sets next to the address of a local Node\nwhose data is ${n}.`,
        'Which invariant has been broken?',
        'The owning link must not delete a node with automatic storage duration.',
        [
          'All non-null pointers are valid exclusive owners.',
          'Stack objects must never be destroyed at all.',
          'An int data field must always equal zero.',
        ],
        'Automatic local objects are destroyed by scope exit. Their addresses must not be passed to delete. This owning design also needs exclusive, acyclic chains; a non-null pointer alone is insufficient.',
        'Separate ordinary destruction from using delete on storage not allocated by new.',
      );
    },
    'scenario',
  ),
  family(5, 'visibility-default', 'easy', 'What is private by default?', '4', (r) => {
    const isClass = r.pick([true, false]),
      n = r.int(2, 25);
    return compilation(
      `${isClass ? 'class' : 'struct'} Meter { int value; };\nint main() { Meter m; m.value = ${n}; }`,
      !isClass,
      isClass
        ? 'class members are private unless another access label changes that. The outside assignment cannot access value.'
        : 'struct members are public by default, so this member access is permitted. This says nothing about whether exposing the field is a good design.',
      'The keywords differ in their default member access.',
    );
  }),
  family(5, 'front-insertion', 'medium', 'The new node becomes the head', '4–5', (r) => {
    const a = r.int(2, 10),
      b = a + r.int(2, 5),
      c = b + r.int(1, 5);
    return output(
      `${LIST_CPP}\nint main() {\n  List values;\n  values.addToFront(${a});\n  values.addToFront(${b});\n  values.addToFront(${c});\n  std::cout << values.ith(0) << " " << values.ith(2);\n}`,
      `${c} ${a}`,
      `Each insertion links a new head to the previous chain. The final sequence is [${c}, ${b}, ${a}], so indexes 0 and 2 access ${c} and ${a}. Only the data is exposed by ith; node links remain private.`,
      'Write the complete sequence after each front insertion.',
      [`${a} ${c}`, `${b} ${a}`, `${c} ${b}`],
    );
  }),
  family(5, 'indexed-reference', 'medium', 'An int reference, not a node handle', '5', (r) => {
    const a = r.int(2, 10),
      b = a + r.int(2, 5),
      d = r.int(2, 5);
    return output(
      `${LIST_CPP}\nint main() {\n  List values;\n  values.addToFront(${a});\n  values.addToFront(${b});\n  values.ith(1) += ${d};\n  std::cout << values.ith(1);\n}`,
      a + d,
      'ith returns int&, so the assignment updates the stored integer. It does not give clients a Node pointer or permission to change owning links. The index must be valid and the returned reference must not outlive its node.',
      'Read the return type of ith.',
    );
  }),
];
