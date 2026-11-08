import { serve } from '@hono/node-server';
const port = Number(process.env.TRACERACE_API_PORT ?? 8787);
process.env.TRACERACE_AUTH_URL = process.env.TRACERACE_LOCAL_ORIGIN || 'http://localhost:' + port;
void import('./function').then(({ default: app }) => {
  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () =>
    console.log('TraceRace API listening on ' + process.env.TRACERACE_AUTH_URL),
  );
});
