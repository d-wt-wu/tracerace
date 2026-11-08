import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHALLENGES, UNITS, challengesFor, correctChoice } from '../src/content/curriculum';
import { traceAnswer, traceProgram } from '../src/engine/c';

test('curriculum IDs and units are valid and unique', () => {
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, CHALLENGES.length);
  assert.equal(UNITS.length, 9);
  for (const u of UNITS) assert.ok(challengesFor(u.id).length >= 3);
  for (const c of CHALLENGES) assert.ok(UNITS.some((u) => u.id === c.unit));
});
for (const c of CHALLENGES) {
  test(c.id + ': trace, declared answer, and unique choice agree', () => {
    const trace = traceProgram(c.code);
    if (c.mode === 'trace') assert.equal(traceAnswer(trace), c.expected);
    if (c.mode === 'trace') assert.equal(trace.fault?.kind, c.faultExpected);
    assert.equal(correctChoice(c).value, c.expected);
    assert.equal(c.choices.length, 4);
    assert.equal(new Set(c.choices.map((a) => a.value)).size, 4);
    assert.equal(c.choices.filter((a) => a.value === c.expected).length, 1);
    assert.ok(c.explanation.length > 30 && c.hint.length > 15);
  });
}
