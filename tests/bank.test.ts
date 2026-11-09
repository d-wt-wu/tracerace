import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FAMILIES,
  makeQuestion,
  questionMaterial,
  freshVariant,
  selectPractice,
} from '../src/content/bank';
import { traceProgram, traceAnswer } from '../src/engine/c';
test('all core and course families produce labelled, deterministic, valid variants across 128 seeds', () => {
  assert.equal(FAMILIES.filter((f) => f.topic !== 'cscb07').length, 36);
  assert.ok(FAMILIES.filter((f) => f.topic === 'cscb07').length >= 60);
  for (const family of FAMILIES)
    for (let seed = 0; seed < 128; seed++) {
      const q = makeQuestion(family.id, seed);
      assert.deepEqual(q, makeQuestion(family.id, seed));
      assert.ok(['easy', 'medium', 'hard'].includes(q.difficulty));
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices.map((c) => c.value)).size, 4);
      assert.equal(q.choices.filter((c) => c.value === q.expected).length, 1);
      if (q.mode === 'trace') {
        const t = traceProgram(q.code);
        assert.equal(traceAnswer(t), q.expected);
        assert.equal(t.fault?.kind, q.faultExpected);
      }
    }
});
test('answer positions vary and all families have more than one substantive variant', () => {
  for (const f of FAMILIES) {
    const questions = Array.from({ length: 64 }, (_, seed) => makeQuestion(f.id, seed));
    assert.ok(
      new Set(questions.map((q) => q.choices.findIndex((c) => c.value === q.expected))).size >= 3,
      f.id,
    );
    assert.ok(new Set(questions.map((q) => q.variantId)).size > 1, f.id);
  }
});
test('shuffling answers or changing distractors does not manufacture a new rewarded problem', () => {
  const q = makeQuestion('warm-up', 42);
  assert.equal(questionMaterial(q), questionMaterial({ ...q, choices: [...q.choices].reverse() }));
  assert.equal(
    questionMaterial(q),
    questionMaterial({ ...q, choices: [{ value: q.expected, label: q.expected }] }),
  );
});
test('fresh-variant selection avoids a recent problem when another variant exists', () => {
  const old = makeQuestion('warm-up', 42);
  assert.notEqual(freshVariant('warm-up', 42, [old.variantId]).variantId, old.variantId);
  const mixed = selectPractice(
    FAMILIES.map((f) => f.id),
    9,
  );
  assert.equal(mixed.length, 5);
  assert.equal(new Set(mixed.map((q) => q.id)).size, 5);
});
test('bad family IDs and invalid seeds are rejected explicitly', () => {
  for (const seed of [-1, 0x100000000, NaN, 1.5])
    assert.throws(() => makeQuestion('warm-up', seed));
  assert.throws(() => makeQuestion('missing', 0));
});
test('numeric algorithm and systems variants agree with independent reference calculations', () => {
  for (let seed = 0; seed < 64; seed++) {
    const stack = makeQuestion('stack-top', seed),
      sd = stack.data as { ns: number[]; pops: number };
    const stackModel = [...sd.ns];
    for (let i = 0; i < sd.pops; i++) stackModel.pop();
    assert.equal(stack.expected, String(stackModel.at(-1)));
    const queue = makeQuestion('queue-front', seed),
      qd = queue.data as { ns: number[]; removals: number };
    const queueModel = [...qd.ns];
    for (let i = 0; i < qd.removals; i++) queueModel.shift();
    assert.equal(queue.expected, String(queueModel[0]));
    const window = makeQuestion('rolling-window', seed),
      wd = window.data as { ns: number[]; k: number };
    let best = -Infinity;
    for (let i = 0; i <= wd.ns.length - wd.k; i++) {
      let sum = 0;
      for (let j = i; j < i + wd.k; j++) sum += wd.ns[j];
      best = Math.max(sum, best);
    }
    assert.equal(window.expected, String(best));
    const heap = makeQuestion('heap-next', seed),
      hd = heap.data as { ns: number[]; insert: number; pops: number };
    const remaining = [...hd.ns, hd.insert];
    for (let i = 0; i < hd.pops; i++)
      remaining.splice(remaining.indexOf(Math.min(...remaining)), 1);
    assert.equal(heap.expected, String(Math.min(...remaining)));
    const bits = makeQuestion('bit-patterns', seed);
    assert.equal(bits.expected, String(1 << Number(bits.data!.bits)));
  }
});
test('LRU questions agree with an ordered-map cache simulation', () => {
  for (let seed = 0; seed < 64; seed++) {
    const q = makeQuestion('lru-cache', seed),
      d = q.data as { capacity: number; accesses: string[] };
    const cache = new Map<string, boolean>();
    let evicted = '';
    for (const key of d.accesses) {
      cache.delete(key);
      cache.set(key, true);
      if (cache.size > d.capacity) {
        evicted = cache.keys().next().value!;
        cache.delete(evicted);
      }
    }
    assert.equal(q.expected, evicted);
  }
});
test('unweighted graph answers agree with breadth-first search', () => {
  for (let seed = 0; seed < 64; seed++) {
    const q = makeQuestion('graph-hops', seed),
      d = q.data as { edges: string[][]; target: string };
    const todo: [string, number][] = [['A', 0]],
      seen = new Set<string>();
    let result = -1;
    while (todo.length) {
      const [node, distance] = todo.shift()!;
      if (seen.has(node)) continue;
      seen.add(node);
      if (node === d.target) {
        result = distance;
        break;
      }
      for (const [a, b] of d.edges) {
        if (a === node) todo.push([b, distance + 1]);
        if (b === node) todo.push([a, distance + 1]);
      }
    }
    assert.equal(q.expected, String(result));
  }
});
