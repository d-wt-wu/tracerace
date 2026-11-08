import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupTables, decryptBackup, encryptBackup, type AppBackup } from '../server/backup';
test('encrypted backups round trip without exposing records and reject tampering or the wrong key', () => {
  const data: AppBackup = {
    version: 1,
    createdAt: '2026-11-08T00:00:00Z',
    migrations: ['a'],
    tables: Object.fromEntries(backupTables.map((t) => [t, []])),
  };
  data.tables.auth_users = [{ id: 'private-user', email: 'fixture@example.invalid' }];
  const key = 'a'.repeat(64);
  const encrypted = encryptBackup(data, key);
  assert.ok(!encrypted.includes('fixture@example.invalid'));
  assert.deepEqual(decryptBackup(encrypted, key), data);
  assert.throws(() => decryptBackup(encrypted, 'b'.repeat(64)));
  const altered = JSON.parse(encrypted);
  altered.ciphertext = Buffer.from('tampered').toString('base64');
  assert.throws(() => decryptBackup(JSON.stringify(altered), key));
  assert.throws(() => encryptBackup(data, 'not-a-key'));
});
