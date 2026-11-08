# The teaching interpreter

TraceRace uses a bounded, deterministic interpreter for a curated subset of C. It is original application code in src/engine/c.ts. It does not call eval, execute downloaded code, or send snippets to a remote service.

A tokenizer attaches source line numbers to tokens. A Pratt parser builds expression trees using C-like operator precedence. A small machine evaluates statements against bindings and memory blocks. After each statement, it copies a display snapshot. The same result determines the correct answer and drives the visual trace.

## Supported teaching model

- int is signed 32-bit; sizeof(int) is 4.
- Local int values, initialized int pointers, and int arrays of 1–64 elements.
- Assignments, +=, -=, integer arithmetic, numeric comparisons, array indexing, address-of and dereference.
- Pointer arithmetic counts elements. Forming a one-past pointer is allowed; reading through it is diagnosed.
- printf supports literal text or one %d argument.
- malloc supports 1–64 ints and **assumes success**. free tracks allocation lifetime.
- Null access, invalid frees, use-after-free, uninitialized reads, bounds errors, division by zero, and signed overflow are explicit teaching faults.
- Source is capped at 8,000 characters and 80 statements.
- Diagrams use illustrative addresses; pointer variables are shown separately, not laid out with a real C ABI.

## Deliberate limits

This is not a conforming C compiler, sanitizer, or general code runner. It accepts snippets inside main(), not includes or function definitions. It has no loops, branches, function calls beyond its built-ins, casts, structs, pointer-to-pointer values, pointer comparisons, alternate integer types, a real allocator, real process memory, or complete C sequence-point semantics. Unsupported input is rejected. The UI only supplies reviewed lesson snippets.

Fault labels explain undefined behavior; they do not predict what a real C executable will print or promise a crash. A bounded teaching model is useful because it can show the failed access without actually performing it.

## Independent validation

- Tests exercise precedence, aliasing, snapshots, boundaries, faults, and unsupported constructs.
- C generator answers come from independent parameter formulas, and the interpreter is checked against them across 128 seeds per family. Reasoning families have separate deterministic evaluators.
- scripts/verify-c.ts separately wraps 36 sampled defined-behavior C variants across 12 families in a real C17 main function, compiles with clang, and compares stdout.
- The three undefined-behavior lessons are never executed as native C programs.
- Passing these checks validates this curriculum and selected edge cases, not the entire C language.

## Interview discussion

Be ready to explain why pointer arithmetic uses indexes rather than byte offsets internally; how a copied snapshot avoids rewriting history; why "NULL prints zero" is an incorrect answer; how the parser binds multiplication before addition; and why a compiler reference check is independent of the interpreter's own tests.
