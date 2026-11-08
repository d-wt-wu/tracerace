import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// Expo Router SDK 57 requires query-string's callable CommonJS decoder API.
const query = require('query-string') as {
  parse: (s: string) => Record<string, unknown>;
  stringify: (o: Record<string, unknown>) => string;
};
const decode = require('decode-uri-component') as (s: string) => string;

test('navigation query parsing retains repeated values and Unicode', () => {
  const input = { unit: 'pointers', title: '学习 C', tag: ['one', 'two'] };
  assert.deepEqual({ ...query.parse(query.stringify(input)) }, input);
});
test('patched decoder keeps its legacy callable API and handles malformed bytes', () => {
  assert.equal(decode('%C3%A5'), 'å');
  assert.equal(decode('%FE%FF'), '��');
  assert.equal(decode('%G0%41'), '%G0A');
  assert.throws(() => decode(null as unknown as string), TypeError);
});
test('malformed navigation decoding completes in a bounded child process', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', 'const d=require("decode-uri-component"); console.log(d("%FE".repeat(1000)).length);'],
    { encoding: 'utf8', timeout: 2000 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '3000');
});
