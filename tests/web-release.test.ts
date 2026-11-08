import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { clientHeaders, createWebApp } from '../server/web-app';

test('web hosting keeps API failures separate from SPA navigation and never serves dotfiles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tracerace-web-test-'));
  try {
    await writeFile(join(root, 'index.html'), '<title>TraceRace test shell</title>');
    await writeFile(join(root, 'privacy.html'), '<title>Privacy without sign-in</title>');
    await writeFile(join(root, '.env.local'), 'this file must not be served');
    const api = new Hono();
    api.get('/health', (c) => c.json({ ok: true }));
    api.notFound((c) => c.json({ error: 'Missing API route' }, 404));
    const app = createWebApp(api, root);
    const headers = { Accept: 'text/html' };
    const direct = await app.request('/account/settings', { headers });
    assert.equal(direct.status, 200);
    assert.match(await direct.text(), /TraceRace test shell/);
    assert.equal(direct.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await app.request('/privacy', { headers })).status, 200);
    const missing = await app.request('/api/missing', { headers });
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('Content-Type') || '', /application\/json/);
    assert.equal((await app.request('/missing.js', { headers })).status, 404);
    assert.equal((await app.request('/.env.local', { headers })).status, 404);
    assert.equal((await app.request('/%2eenv.local', { headers })).status, 404);
    assert.equal((await app.request('/health')).status, 200);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('caller-supplied rate-limit identity is ignored and only a validated last Render hop is trusted', () => {
  const headers = new Headers({
    'x-tracerace-client-ip': 'spoofed',
    'x-forwarded-for': '1.1.1.1, 203.0.113.2',
  });
  assert.equal(clientHeaders(headers, false).get('x-tracerace-client-ip'), null);
  assert.equal(clientHeaders(headers, true).get('x-tracerace-client-ip'), '203.0.113.2');
  headers.set('x-forwarded-for', 'invalid');
  assert.equal(clientHeaders(headers, true).get('x-tracerace-client-ip'), null);
});
