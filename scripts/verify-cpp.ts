/** Compile reviewed fixtures only. No user-submitted code runs on the server. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CSCB07_FAMILIES } from '../src/content/cscb07';
import { makeQuestion } from '../src/content/bank';
import type { CppCheck } from '../src/content/cscb07/shared';
import { CSCB07_LESSONS } from '../src/content/cscb07/lessons';
import { WRITTEN_TASKS } from '../src/content/cscb07/written';

const folder = mkdtempSync(join(tmpdir(), 'tracerace-cpp-'));
let runs = 0,
  builds = 0,
  rejected = 0;
let workedExamples = 0,
  writtenModels = 0;
function verifyModel(name: string, code: string, expected: string) {
  const source = join(folder, name + '.cpp'),
    executable = join(folder, name);
  writeFileSync(
    source,
    '#include <iostream>\n#include <utility>\n#include <vector>\n#include <string>\n' + code + '\n',
  );
  const build = spawnSync('clang++', ['-std=c++20', '-O0', source, '-o', executable], {
    encoding: 'utf8',
    timeout: 15000,
  });
  if (build.error) throw build.error;
  assert.equal(build.status, 0, name + ': model build failed\n' + build.stderr);
  const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 2000 });
  assert.equal(run.status, 0, name + ': model failed');
  assert.equal(run.stdout.trim(), expected, name + ': model output disagrees');
}
try {
  for (const f of CSCB07_FAMILIES) {
    for (const seed of [0, 17, 123]) {
      const q = makeQuestion(f.id, seed);
      const check = q.data?.cpp as (CppCheck & { phase?: string }) | undefined;
      if (!check) continue; // Specification/ownership reasoning is not a program execution oracle.
      const source = join(folder, q.id + '-' + seed + '.cpp');
      const executable = join(folder, q.id + '-' + seed);
      writeFileSync(
        source,
        '#include <iostream>\n#include <utility>\n#include <vector>\n#include <string>\n' +
          q.code +
          '\n',
      );
      if (check.kind === 'compile' && check.phase === 'missing-definition') {
        const syntax = spawnSync('clang++', ['-std=c++20', '-fsyntax-only', source], {
          encoding: 'utf8',
          timeout: 15000,
        });
        assert.equal(syntax.status, 0, q.id + ': intended link failure must pass syntax checking');
      }
      const compiled = spawnSync(
        'clang++',
        ['-std=c++20', '-Wall', '-Wextra', '-O0', source, '-o', executable],
        { encoding: 'utf8', timeout: 15000 },
      );
      if (compiled.error) throw compiled.error;
      if (check.kind === 'compile' && !check.compiles) {
        assert.notEqual(compiled.status, 0, q.id + ': invalid fixture unexpectedly built');
        rejected++;
        continue;
      }
      assert.equal(compiled.status, 0, q.id + ': build failed\n' + compiled.stderr);
      builds++;
      if (check.kind === 'run') {
        const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 2000 });
        if (run.error) throw run.error;
        assert.equal(run.status, 0, q.id + ': fixture failed');
        assert.equal(run.stdout.trim(), q.expected, q.id + ': C++ disagrees with the bank answer');
        assert.equal(check.output, q.expected);
        runs++;
      }
    }
  }
  for (const l of CSCB07_LESSONS) {
    if (l.example.output === undefined) continue;
    verifyModel(
      'lesson-' + l.id,
      (l.example.prelude ?? '') + '\nint main(){\n' + l.example.code + '\n}',
      l.example.output,
    );
    workedExamples++;
  }
  for (const t of WRITTEN_TASKS) {
    if (!t.check) continue;
    verifyModel(
      'written-' + t.id,
      (t.check.prelude ?? '') + '\nint main(){\n' + t.check.body + '\n}',
      t.check.output,
    );
    writtenModels++;
  }
  const compile = (args: string[]) => {
    const r = spawnSync('clang++', ['-fcxx-modules', ...args], {
      cwd: folder,
      encoding: 'utf8',
      timeout: 15000,
    });
    if (r.error) throw r.error;
    assert.equal(r.status, 0, 'named module round trip failed\n' + r.stderr);
  };
  writeFileSync(
    join(folder, 'score.cppm'),
    'export module score;\nexport struct Score{int value;};\nexport int doubled(const Score&);\n',
  );
  writeFileSync(
    join(folder, 'score-impl.cpp'),
    'module score;\nint doubled(const Score&s){return s.value*2;}\n',
  );
  writeFileSync(
    join(folder, 'client.cpp'),
    'import score;\nint main(){Score s{6};return doubled(s)==12?0:1;}\n',
  );
  compile(['-std=c++20', '--precompile', 'score.cppm', '-o', 'score.pcm']);
  compile(['-std=c++20', '-c', 'score.pcm', '-o', 'score.o']);
  compile([
    '-std=c++20',
    '-fprebuilt-module-path=' + folder,
    '-c',
    'score-impl.cpp',
    '-o',
    'impl.o',
  ]);
  compile(['-std=c++20', '-fprebuilt-module-path=' + folder, '-c', 'client.cpp', '-o', 'client.o']);
  compile(['score.o', 'impl.o', 'client.o', '-o', 'module-check']);
  assert.equal(spawnSync(join(folder, 'module-check'), [], { timeout: 2000 }).status, 0);
  console.log(
    JSON.stringify({
      standard: 'C++20',
      successfulBuilds: builds,
      outputComparisons: runs,
      expectedBuildFailures: rejected,
      workedExamples,
      writtenModels,
      namedModuleRoundTrip: true,
      unsafeProgramsExecuted: 0,
    }),
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
