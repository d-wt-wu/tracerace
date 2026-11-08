/**
 * Independent reference check: compile only the curated, defined-behavior
 * snippets as real C17 programs. Never execute the undefined-behavior lessons.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHALLENGES } from '../src/content/curriculum';
import { makeQuestion } from '../src/content/bank';

const folder = mkdtempSync(join(tmpdir(), 'tracerace-c-'));
let verified = 0;
try {
  const variants = CHALLENGES.filter((q) => q.mode === 'trace' && !q.faultExpected).flatMap((q) =>
    [0, 17, 123].map((seed) => makeQuestion(q.id, seed)),
  );
  for (const c of variants) {
    const source = join(folder, c.id + '-' + c.seed + '.c'),
      executable = join(folder, c.id + '-' + c.seed);
    writeFileSync(
      source,
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n' + c.code + '\nreturn 0;\n}\n',
    );
    const compiled = spawnSync(
      'clang',
      ['-std=c17', '-Wall', '-Wextra', '-Werror', '-O0', source, '-o', executable],
      { encoding: 'utf8', timeout: 10000 },
    );
    if (compiled.error) throw compiled.error;
    assert.equal(compiled.status, 0, c.id + ': compiler failed\n' + compiled.stderr);
    const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 2000 });
    if (run.error) throw run.error;
    assert.equal(run.status, 0, c.id + ': executable failed');
    assert.equal(run.stdout.trim(), c.expected, c.id + ': C output disagrees');
    verified++;
  }
  console.log(
    verified +
      ' safe variants across 12 C families independently verified against clang C17. The ' +
      CHALLENGES.filter((c) => c.faultExpected).length +
      ' undefined-behavior lessons are interpreter-tested and deliberately not executed.',
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
