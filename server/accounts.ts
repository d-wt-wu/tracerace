import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import type { AccountAuth } from './auth';
import { allowAccountWrite } from './origins';
import type { AccountUser } from '../src/domain/account';
import { decodeProgress } from '../src/state/progress';
import { FAMILIES } from '../src/content/bank';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function accountRoutes(
  pool: Pool,
  auth: AccountAuth,
  quota: (key: string, maximum: number, expires: Date) => Promise<boolean>,
) {
  const app = new Hono<{ Variables: { accountUser: AccountUser } }>();
  app.use('*', async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result?.user) return c.json({ error: 'Sign in to access your account.' }, 401);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !allowAccountWrite(c.req.raw.headers))
      return c.json({ error: 'This request did not come from TraceRace.' }, 403);
    if (!(await quota('account:' + result.user.id, 120, new Date(Date.now() + 60000))))
      return c.json({ error: 'A little breather: try again in a minute.' }, 429);
    c.set('accountUser', result.user);
    await next();
  });
  app.get('/profile', async (c) => {
    const result = await pool.query('select id, alias, active from players where auth_user_id=$1', [
      c.get('accountUser').id,
    ]);
    return c.json({ profile: result.rows[0] ?? null });
  });
  app.post('/profile', async (c) => {
    const body = await c.req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((k) => !['alias', 'guestToken', 'active'].includes(k))
    )
      return c.json({ error: 'Unexpected profile fields.' }, 400);
    const alias = typeof body.alias === 'string' ? body.alias.trim().replace(/\s+/g, ' ') : '';
    if (!/^[A-Za-z0-9 _-]{2,20}$/.test(alias) || typeof body.active !== 'boolean')
      return c.json(
        { error: 'Use a nickname with 2–20 letters, numbers, spaces, underscores, or dashes.' },
        400,
      );
    if (
      body.guestToken !== undefined &&
      (typeof body.guestToken !== 'string' || !/^tr_[a-f0-9]{64}$/.test(body.guestToken))
    )
      return c.json({ error: 'Invalid guest ticket.' }, 400);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const userId = c.get('accountUser').id;
      // Serialize first-profile creation for an account, including concurrent device requests.
      await client.query('select id from auth_users where id=$1 for update', [userId]);
      const existing = await client.query(
        'select id, alias, active from players where auth_user_id=$1',
        [userId],
      );
      if (existing.rows[0]) {
        await client.query('commit');
        return c.json({ profile: existing.rows[0], claimedGuest: false });
      }
      let profile;
      const tokenHash = digest(randomBytes(32).toString('hex'));
      if (body.guestToken) {
        const guest = await client.query(
          'select id from players where token_hash=$1 and auth_user_id is null for update',
          [digest(body.guestToken)],
        );
        if (guest.rows[0]) {
          const result = await client.query(
            'update players set auth_user_id=$1, token_hash=$2, alias=$3, active=$4 where id=$5 returning id, alias, active',
            [userId, tokenHash, alias, body.active, guest.rows[0].id],
          );
          profile = result.rows[0];
        }
      }
      const claimedGuest = !!profile;
      if (!profile) {
        const result = await client.query(
          'insert into players(auth_user_id, alias, active, token_hash) values($1,$2,$3,$4) returning id, alias, active',
          [userId, alias, body.active, tokenHash],
        );
        profile = result.rows[0];
      }
      await client.query('commit');
      return c.json({ profile, claimedGuest }, 201);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });
  app.get('/progress', async (c) => {
    const result = await pool.query(
      'select progress, revision, updated_at from cloud_progress where user_id=$1',
      [c.get('accountUser').id],
    );
    const row = result.rows[0];
    return c.json(
      row
        ? { progress: row.progress, revision: row.revision, updatedAt: row.updated_at }
        : { progress: null, revision: 0, updatedAt: null },
    );
  });
  app.put('/progress', async (c) => {
    const body = await c.req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((k) => !['progress', 'revision'].includes(k)) ||
      !body.progress ||
      typeof body.progress !== 'object' ||
      Array.isArray(body.progress) ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 0
    )
      return c.json({ error: 'Invalid progress save.' }, 400);
    let progress;
    try {
      progress = decodeProgress(
        JSON.stringify(body.progress),
        FAMILIES.map((f) => f.id),
      );
    } catch {
      return c.json({ error: 'This progress save could not be validated.' }, 400);
    }
    const userId = c.get('accountUser').id;
    // Drafts stay on their originating device; ranked results are verified separately in assessment_runs.
    progress.assessmentDraft = null;
    const value = JSON.stringify(progress);
    const result =
      body.revision === 0
        ? await pool.query(
            'insert into cloud_progress(user_id, progress, revision) values($1,$2::jsonb,1) on conflict(user_id) do nothing returning revision, updated_at',
            [userId, value],
          )
        : await pool.query(
            'update cloud_progress set progress=$1::jsonb, revision=revision+1, updated_at=now() where user_id=$2 and revision=$3 returning revision, updated_at',
            [value, userId, body.revision],
          );
    if (!result.rows[0])
      return c.json(
        {
          error:
            'Your account has a newer save from another device. Review it before replacing anything.',
          conflict: true,
        },
        409,
      );
    return c.json({ revision: result.rows[0].revision, updatedAt: result.rows[0].updated_at });
  });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return c.json({ error: 'Send a valid JSON object.' }, 400);
    console.error('Account request failed:', error instanceof Error ? error.name : 'UnknownError');
    return c.json(
      { error: 'Your account could not complete that request. Please try again.' },
      500,
    );
  });
  return app;
}
