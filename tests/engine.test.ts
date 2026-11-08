import assert from 'node:assert/strict';
import { test } from 'node:test';
import { traceAnswer, traceProgram, type FaultKind } from '../src/engine/c';

const output = (source: string) => traceAnswer(traceProgram(source));
const fault = (source: string, kind: FaultKind) =>
  assert.equal(traceProgram(source).fault?.kind, kind);

test('arithmetic follows C precedence, associativity, and integer division', () => {
  assert.equal(output('int n = 2 + 3 * 4; printf("%d", n);'), '14');
  assert.equal(output('int n = 20 - 5 - 3; printf("%d", n);'), '12');
  assert.equal(output('int n = -11 / 3; printf("%d", n);'), '-3');
  assert.equal(output('int n = (2 + 3) * 4; printf("%d", n);'), '20');
  assert.equal(output('int n = 2 == 1 < 2; printf("%d", n);'), '0');
});
test('assignment copies values; pointers alias the original cell', () => {
  assert.equal(output('int a = 5; int b = a; a = 9; printf("%d", b);'), '5');
  assert.equal(output('int x = 4; int *p = &x; int *q = p; *q += 8; printf("%d", x);'), '12');
});
test('partial array initialization zeroes the remaining cells', () => {
  assert.equal(output('int a[3] = {7}; printf("%d", a[2]);'), '0');
});
test('pointer arithmetic advances in int-sized elements', () => {
  const t = traceProgram('int a[3] = {2, 4, 8}; int *p = a; p += 2; printf("%d", *p);');
  assert.equal(traceAnswer(t), '8');
  const p = t.steps.at(-1)!.variables.find((v) => v.name === 'p')!;
  assert.equal(p.target, t.steps.at(-1)!.memory[0].cells[2].address);
});
test('address-of an array cell and both indexing syntaxes agree', () => {
  assert.equal(output('int a[3] = {2, 4, 8}; int *p = &a[1]; printf("%d", *(p + 1));'), '8');
  assert.equal(output('int a[3] = {2, 4, 8}; int *p = a; printf("%d", p[2]);'), '8');
});
test('one-past pointer formation is allowed, dereferencing it is not', () => {
  assert.equal(output('int a[2] = {5, 9}; int *p = a + 2; p -= 1; printf("%d", *p);'), '9');
  fault('int a[2] = {5, 9}; int *p = a + 2; printf("%d", *p);', 'out-of-bounds');
  fault('int a[2] = {5, 9}; int *p = a + 3;', 'out-of-bounds');
});
test('negative and upper array bounds are diagnosed', () => {
  fault('int a[2] = {5, 9}; printf("%d", a[-1]);', 'out-of-bounds');
  fault('int a[2] = {5, 9}; printf("%d", a[2]);', 'out-of-bounds');
});
test('null reads and writes are diagnosed, free(NULL) is valid', () => {
  fault('int *p = NULL; printf("%d", *p);', 'null-pointer');
  fault('int *p = 0; *p = 9;', 'null-pointer');
  assert.equal(output('free(NULL); printf("ok");'), 'ok');
});
test('uninitialized stack and heap reads have no invented value', () => {
  fault('int n; printf("%d", n);', 'uninitialized');
  fault('int *p = malloc(sizeof(int)); printf("%d", *p);', 'uninitialized');
});
test('heap aliasing and lifetime are tracked together', () => {
  assert.equal(
    output(
      'int *p = malloc(2 * sizeof(int)); p[0] = 3; int *q = p + 1; *q = 8; printf("%d", p[1]); free(p);',
    ),
    '8',
  );
  fault(
    'int *p = malloc(sizeof(int)); int *q = p; *p = 3; free(p); printf("%d", *q);',
    'use-after-free',
  );
  fault('int *p = malloc(sizeof(int)); free(p); *p = 3;', 'use-after-free');
});
test('double frees, interior frees, and stack frees are rejected', () => {
  fault('int *p = malloc(sizeof(int)); free(p); free(p);', 'invalid-free');
  fault('int *p = malloc(2 * sizeof(int)); free(p + 1);', 'invalid-free');
  fault('int x = 3; free(&x);', 'invalid-free');
});
test('signed overflow and division by zero are explicit faults', () => {
  fault('int n = 2147483647; n += 1;', 'overflow');
  fault('int n = 1 / 0;', 'division-by-zero');
});
test('unsupported constructs fail explicitly rather than pretend to execute', () => {
  fault('while (1) { }', 'unsupported');
  fault('int a[65];', 'unsupported');
  fault('int *p = malloc(257);', 'unsupported');
  fault('int x = 2; int *p = &x; int *q = &p;', 'unsupported');
  fault('int n = 2 % 1;', 'unsupported');
});
test('syntax errors include a source line', () => {
  const t = traceProgram('int x = 3;\nint y = ;');
  assert.equal(t.fault?.kind, 'syntax');
  assert.equal(t.fault?.line, 2);
});
test('faults stop execution and preserve output before the fault', () => {
  const t = traceProgram('printf("before");\nint *p = NULL;\nprintf("%d", *p);\nprintf("after");');
  assert.equal(t.output, 'before');
  assert.equal(t.fault?.line, 3);
});
test('snapshots are independent immutable historical values', () => {
  const t = traceProgram('int n = 2;\nn = 9;\nprintf("%d", n);');
  assert.equal(t.steps[1].variables[0].value, '2');
  assert.equal(t.steps[1].memory[0].cells[0].value, '2');
  assert.equal(t.steps[2].variables[0].value, '9');
  assert.notEqual(t.steps[1].memory[0], t.steps[2].memory[0]);
});
test('teaching traces have bounded source and statement counts', () => {
  fault(' '.repeat(8001), 'unsupported');
  fault('printf("x");'.repeat(81), 'unsupported');
});
