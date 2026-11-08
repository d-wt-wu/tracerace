import { readFile, writeFile, chmod } from 'node:fs/promises';
import { Pool } from 'pg';
import { databaseURL } from '../server/database-url';
import { captureBackup, decryptBackup, encryptBackup, restoreBackup } from '../server/backup';
async function main() {
  const [action, file] = process.argv.slice(2);
  const key = process.env.TRACERACE_BACKUP_KEY;
  const branch = process.env.NEON_BRANCH;
  if (!key || !branch || branch === 'main' || !file || !['capture', 'restore'].includes(action))
    throw new Error(
      'Provide a non-main database, private backup key, capture/restore action, and file path.',
    );
  const pool = new Pool({ connectionString: databaseURL(process.env.DATABASE_URL), max: 1 });
  try {
    const client = await pool.connect();
    try {
      if (action === 'capture') {
        const data = await captureBackup(client);
        await writeFile(file, encryptBackup(data, key), { mode: 0o600, flag: 'wx' });
        await chmod(file, 0o600);
        console.log(
          JSON.stringify({
            action,
            branch,
            rows: Object.fromEntries(
              Object.entries(data.tables).map(([t, rows]) => [t, rows.length]),
            ),
            encrypted: true,
          }),
        );
      } else {
        const data = decryptBackup(await readFile(file, 'utf8'), key);
        await restoreBackup(client, data, branch);
        console.log(JSON.stringify({ action, branch, restored: true, sessionsRestored: false }));
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    'Backup operation failed. Verify the target, empty-state guard, migration baseline and private key; no credentials were printed.',
  );
  process.exit(1);
});
