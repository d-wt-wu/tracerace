import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';

export const backupTables = [
  'auth_users',
  'auth_accounts',
  'players',
  'cloud_progress',
  'family_solves',
  'practice_attempts',
  'xp_events',
  'assessment_runs',
] as const;
export type AppBackup = {
  version: 1;
  createdAt: string;
  migrations: string[];
  tables: Record<string, Record<string, unknown>[]>;
};
const backupKey = (key: string) => {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('A separate 32-byte backup key is required.');
  return Buffer.from(key, 'hex');
};
export function encryptBackup(backup: AppBackup, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', backupKey(key), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(backup), 'utf8'), cipher.final()]);
  return JSON.stringify({
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  });
}
export function decryptBackup(input: string, key: string): AppBackup {
  const data = JSON.parse(input);
  if (data.version !== 1 || data.algorithm !== 'aes-256-gcm')
    throw new Error('Unknown backup format.');
  const decipher = createDecipheriv('aes-256-gcm', backupKey(key), Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  const result = JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(data.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8'),
  );
  if (
    result.version !== 1 ||
    !Array.isArray(result.migrations) ||
    !result.tables ||
    Object.keys(result.tables).length !== backupTables.length ||
    backupTables.some((t) => !Array.isArray(result.tables[t]))
  )
    throw new Error('Invalid app backup.');
  return result;
}
export async function captureBackup(client: PoolClient): Promise<AppBackup> {
  await client.query('begin isolation level repeatable read read only');
  try {
    const tables: AppBackup['tables'] = {};
    for (const table of backupTables)
      tables[table] = (await client.query('select * from ' + table)).rows;
    const migrations = (
      await client.query('select hash from drizzle.__drizzle_migrations order by created_at')
    ).rows.map((r) => r.hash as string);
    await client.query('commit');
    return { version: 1, createdAt: new Date().toISOString(), migrations, tables };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
export async function restoreBackup(client: PoolClient, backup: AppBackup, branch: string) {
  if (!branch.startsWith('restore-check-'))
    throw new Error('Restore is restricted to an isolated restore-check branch.');
  await client.query('begin');
  try {
    const migrations = (
      await client.query('select hash from drizzle.__drizzle_migrations order by created_at')
    ).rows.map((r) => r.hash as string);
    if (JSON.stringify(migrations) !== JSON.stringify(backup.migrations))
      throw new Error('The target schema does not match the backup.');
    for (const table of backupTables) {
      if ((await client.query('select count(*)::int as n from ' + table)).rows[0].n !== 0)
        throw new Error('Restore target must be empty. No data was overwritten.');
    }
    const types = (
      await client.query(
        "select table_name,column_name,data_type from information_schema.columns where table_schema='public'",
      )
    ).rows;
    for (const table of backupTables) {
      const columns = new Map(
        types.filter((r) => r.table_name === table).map((r) => [r.column_name, r.data_type]),
      );
      for (const row of backup.tables[table]) {
        const keys = Object.keys(row);
        if (keys.length !== columns.size || keys.some((k) => !columns.has(k)))
          throw new Error('A backup row does not match the target columns.');
        const values = keys.map((k) =>
          ['json', 'jsonb'].includes(columns.get(k)) && row[k] !== null
            ? JSON.stringify(row[k])
            : row[k],
        );
        await client.query(
          'insert into ' +
            table +
            '(' +
            keys.map((k) => '"' + k.replace(/"/g, '""') + '"').join(',') +
            ') values(' +
            keys.map((_, i) => '$' + (i + 1)).join(',') +
            ')',
          values,
        );
      }
    }
    // Session, verification, quota and rate-limit records are intentionally not restored.
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
