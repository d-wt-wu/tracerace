import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { isIP } from 'node:net';

// Only the Render deployment trusts its last forwarding hop. Ignore caller-supplied identity headers.
export function clientHeaders(headers: Headers, trustRender: boolean): Headers {
  const clean = new Headers(headers);
  clean.delete('x-tracerace-client-ip');
  if (trustRender) {
    const last = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (last && isIP(last)) clean.set('x-tracerace-client-ip', last);
  }
  return clean;
}

export function createWebApp(
  api: { fetch(request: Request): Response | Promise<Response> },
  root = './dist',
  trustRender = false,
) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('X-Frame-Options', 'DENY');
    c.header(
      'Content-Security-Policy',
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    );
    if (!c.req.path.startsWith('/api/') && c.res.headers.get('content-type')?.includes('text/html'))
      c.header('Cache-Control', 'no-cache');
    else if (/(?:-|\.)(?:[a-f0-9]{16,})\.[a-z0-9]+$/.test(c.req.path))
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
  });
  const apiRequest = (request: Request) =>
    api.fetch(new Request(request, { headers: clientHeaders(request.headers, trustRender) }));
  app.all('/api/*', (c) => apiRequest(c.req.raw));
  app.all('/health', (c) => apiRequest(c.req.raw));
  app.get('/privacy', serveStatic({ root, path: '/privacy.html' }));
  app.get('/support', serveStatic({ root, path: '/support.html' }));
  app.use('*', async (c, next) => {
    let path: string;
    try {
      path = decodeURIComponent(c.req.path);
    } catch {
      return c.notFound();
    }
    if (path.split('/').some((part) => part.startsWith('.'))) return c.notFound();
    await next();
  });
  app.use('*', serveStatic({ root }));
  app.get('*', async (c, next) => {
    if (!c.req.header('Accept')?.includes('text/html') || /\.[a-z0-9]+$/i.test(c.req.path))
      return c.notFound();
    c.header('Cache-Control', 'no-cache');
    return serveStatic({ root, path: '/index.html' })(c, next);
  });
  return app;
}
