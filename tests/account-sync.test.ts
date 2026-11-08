import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cloudSnapshot,
  progressKey,
  GUEST_PROGRESS_KEY,
  reconcileProgress,
} from '../src/domain/sync';
import { freshProgress, recordPractice } from '../src/state/progress';
import { makeQuestion } from '../src/content/bank';
import { newDraft } from '../src/domain/assessment';
const practiced = () =>
  recordPractice(freshProgress(), makeQuestion('warm-up', 99), false).progress;
test('guest and account saves remain separate across users and backend environments', () => {
  const a = progressKey('https://accounts-a.example', 'user-a');
  assert.notEqual(a, GUEST_PROGRESS_KEY);
  assert.notEqual(a, progressKey('https://accounts-a.example', 'user-b'));
  assert.notEqual(a, progressKey('https://accounts-b.example', 'user-a'));
  assert.notEqual(
    progressKey('https://a.example', 'a/b'),
    progressKey('https://a.example', 'a%2Fb'),
  );
});
test('cloud backup omits an unfinished device assessment while keeping completed practice', () => {
  const progress = { ...practiced(), assessmentDraft: newDraft(123) };
  const snapshot = JSON.parse(cloudSnapshot(progress));
  assert.equal(snapshot.assessmentDraft, null);
  assert.equal(snapshot.skills['warm-up'].xp, 20);
  assert.ok(progress.assessmentDraft);
});
test('a fresh device restores its existing account save', () => {
  assert.deepEqual(
    reconcileProgress(freshProgress(), null, { revision: 4, progress: practiced() }),
    { conflict: false, useRemote: true },
  );
});
test('device haptics do not create cloud conflicts or overwrite another device preference', () => {
  const a = practiced();
  assert.equal(cloudSnapshot(a), cloudSnapshot({ ...a, haptics: false }));
  assert.equal(
    reconcileProgress(
      { ...a, haptics: false },
      { revision: 1, snapshot: cloudSnapshot(a) },
      { revision: 2, progress: a },
    ).conflict,
    false,
  );
});
test('unchanged local progress safely accepts a newer cloud revision', () => {
  const local = practiced();
  assert.deepEqual(
    reconcileProgress(
      local,
      { revision: 1, snapshot: cloudSnapshot(local) },
      { revision: 2, progress: local },
    ),
    { conflict: false, useRemote: true },
  );
});
test('offline local practice is preserved when cloud has not changed', () => {
  assert.deepEqual(
    reconcileProgress(
      practiced(),
      { revision: 1, snapshot: cloudSnapshot(freshProgress()) },
      { revision: 1, progress: freshProgress() },
    ),
    { conflict: false, useRemote: false },
  );
});
test('independent changes on two devices require a choice instead of an automatic overwrite', () => {
  assert.deepEqual(
    reconcileProgress(
      practiced(),
      { revision: 1, snapshot: cloudSnapshot(freshProgress()) },
      { revision: 2, progress: freshProgress() },
    ),
    { conflict: true, useRemote: false },
  );
});
test('a cache without trustworthy sync metadata cannot overwrite existing cloud practice', () => {
  assert.equal(
    reconcileProgress(practiced(), null, { revision: 3, progress: practiced() }).conflict,
    true,
  );
});
test('explicitly choosing the account copy resolves a conflict', () => {
  assert.deepEqual(
    reconcileProgress(practiced(), null, { revision: 3, progress: freshProgress() }, true),
    { conflict: false, useRemote: true },
  );
});
