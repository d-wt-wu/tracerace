import { serve } from '@hono/node-server';
import { Pool } from 'pg';
import { createApi } from './api';
import { createAuth } from './auth';
import { databaseURL } from './database-url';
import { createWebApp } from './web-app';

const publicURL = process.env.TRACERACE_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
const secret = process.env.TRACERACE_AUTH_SECRET;
const signingKey = process.env.TRACERACE_SIGNING_KEY;
if (!publicURL || !secret || !signingKey)
  throw new Error('The web server environment is incomplete.');
const origin = new URL(publicURL).origin;
if (!origin.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin))
  throw new Error('A public deployment requires HTTPS.');
process.env.TRACERACE_WEB_ORIGIN = origin;
const pool = new Pool({
  connectionString: databaseURL(process.env.DATABASE_URL),
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
});
pool.on('error', () =>
  console.error('An idle database connection closed. It will be reconnected.'),
);
const api = createApi(pool, signingKey, { auth: createAuth(pool, secret, origin) });
const app = createWebApp(api, './dist', process.env.RENDER === 'true');
const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
  hostname: '0.0.0.0',
});
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
console.log('TraceRace web server is ready.');
