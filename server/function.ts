import { databaseURL } from './database-url';
import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { createApi } from './api';
import { createAuth } from './auth';
const url = process.env.DATABASE_URL,
  key = process.env.TRACERACE_SIGNING_KEY;
if (!url || !key) throw new Error('Database and signing key are required.');
const pool = new Pool({
  connectionString: databaseURL(url),
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
attachDatabasePool(pool);
const secret = process.env.TRACERACE_AUTH_SECRET;
const authURL = process.env.TRACERACE_AUTH_URL;
if (!secret || !authURL) throw new Error('Account secret and public auth URL are required.');
export default createApi(pool, key, { auth: createAuth(pool, secret, authURL) });
