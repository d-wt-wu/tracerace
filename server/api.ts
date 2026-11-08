import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';
import { BANK_VERSION, FAMILIES, makeQuestion, questionMaterial } from '../src/content/bank';
import { newDraft, gradeAssessment, type AssessmentResult } from '../src/domain/assessment';
import { utcDay, weekKey } from '../src/domain/ranks';
import type { Board, BoardRow, Boards } from '../src/domain/league';
import { issueTicket, verifyTicket } from './tickets';
import { accountRoutes } from './accounts';
import { authCapabilities, type AccountAuth } from './auth';
import { allowedOrigin, allowAccountWrite } from './origins';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const seed = () => randomInt(0, 0x100000000);
type User = { id: string; alias: string; active: boolean };
type Env = { Variables: { user: User } };
const fail = (message: string, status: 400 | 401 | 403 | 404 | 409 | 429 = 400): never => {
  throw new HTTPException(status, { message });
};
const objectBody = async (c: Context, keys: string[]): Promise<Record<string, unknown>> => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail('Send a valid JSON object.');
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !keys.includes(k))
  )
    return fail('Unexpected request fields.');
  return body as Record<string, unknown>;
};
function nickname(value: unknown): string {
  if (typeof value !== 'string') return fail('Choose a nickname.');
  const clean = value.trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-z0-9 _-]{2,20}$/.test(clean))
    return fail('Use 2–20 letters, numbers, spaces, underscores, or dashes.');
  return clean;
}
const parseRow = (r: Record<string, unknown>): BoardRow => ({
  id: String(r.id),
  alias: String(r.alias),
  rank: Number(r.rank),
  xp: Number(r.xp ?? 0),
  score: r.score === null || r.score === undefined ? null : Number(r.score),
});

export function createApi(
  pool: Pool,
  signingKey: string,
  options: { clock?: () => Date; quotaPrefix?: string; auth?: AccountAuth } = {},
) {
  if (signingKey.length < 32)
    throw new Error('TRACERACE_SIGNING_KEY must contain at least 32 characters');
  const db = drizzle(pool),
    clock = options.clock ?? (() => new Date());
  const app = new Hono<Env>();
  app.use(
    '*',
    cors({
      origin: (origin) => (allowedOrigin(origin) ? origin : ''),
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'expo-origin'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );
  app.use(
    '*',
    bodyLimit({ maxSize: 262144, onError: (c) => c.json({ error: 'Request is too large.' }, 413) }),
  );
  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
  });
  app.get('/health', (c) => c.json({ ok: true, bankVersion: BANK_VERSION }));
  app.get('/api/auth-config', (c) =>
    c.json(
      options.auth
        ? authCapabilities()
        : { email: false, google: false, apple: false, recovery: false, verification: false },
    ),
  );
  if (options.auth) {
    const auth = options.auth;
    app.all('/api/auth/*', (c) => auth.handler(c.req.raw));
    app.route('/api/account', accountRoutes(pool, auth, quota));
  }
  async function quota(key: string, maximum: number, expires: Date): Promise<boolean> {
    key = (options.quotaPrefix ?? 'tracerace') + ':' + key;
    const now = clock();
    const result =
      await db.execute(sql`insert into api_quotas(key, count, expires_at) values(${key}, 1, ${expires.toISOString()}::timestamptz)
      on conflict(key) do update set count = case when api_quotas.expires_at <= ${now.toISOString()}::timestamptz then 1 else api_quotas.count + 1 end,
      expires_at = case when api_quotas.expires_at <= ${now.toISOString()}::timestamptz then excluded.expires_at else api_quotas.expires_at end returning count`);
    return Number(result.rows[0].count) <= maximum;
  }
  app.post('/api/players', async (c) => {
    // This is enrollment, not a client-IP DDoS limiter. The global daily budget is persistent.
    const now = clock(),
      expires = new Date(now);
    expires.setUTCHours(24, 0, 0, 0);
    if (!(await quota('enrollment', 100, expires))) {
      c.header(
        'Retry-After',
        String(Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / 1000))),
      );
      return c.json(
        { error: 'Today’s new-player slots are full. Practice still works on your device.' },
        429,
      );
    }
    const body = await objectBody(c, ['alias']);
    const alias = nickname(body.alias),
      token = 'tr_' + randomBytes(32).toString('hex');
    const result = await db.execute(
      sql`insert into players(alias, token_hash) values(${alias}, ${digest(token)}) returning id, alias, active`,
    );
    return c.json({ ...result.rows[0], token }, 201);
  });
  app.use('/api/*', async (c, next) => {
    const session = options.auth
      ? await options.auth.api.getSession({ headers: c.req.raw.headers })
      : null;
    let user: User;
    if (session?.user) {
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
        !allowAccountWrite(c.req.raw.headers)
      )
        return c.json({ error: 'This request did not come from TraceRace.' }, 403);
      const account = await db.execute(
        sql`select id, alias, active from players where auth_user_id = ${session.user.id} limit 1`,
      );
      if (!account.rows[0])
        return c.json({ error: 'Finish setting up your account profile.' }, 409);
      user = account.rows[0] as User;
    } else {
      const ticket = c.req.header('Authorization');
      if (!ticket || !/^Bearer tr_[a-f0-9]{64}$/.test(ticket))
        return c.json({ error: 'Sign in or join the league to use online rankings.' }, 401);
      const found = await db.execute(
        sql`select id, alias, active from players where token_hash = ${digest(ticket.slice(7))} and auth_user_id is null limit 1`,
      );
      if (!found.rows.length)
        return c.json({ error: 'This player ticket is no longer valid.' }, 401);
      user = found.rows[0] as User;
    }
    const now = clock(),
      bucket = Math.floor(now.getTime() / 60000);
    if (!(await quota('player:' + user.id, 90, new Date((bucket + 1) * 60000)))) {
      c.header('Retry-After', '60');
      return c.json({ error: 'A little breather: try again in a minute.' }, 429);
    }
    c.set('user', user);
    await next();
  });
  app.get('/api/me', (c) => c.json(c.get('user')));
  app.patch('/api/me', async (c) => {
    const body = await objectBody(c, ['alias', 'active']),
      user = c.get('user');
    const alias = body.alias === undefined ? user.alias : nickname(body.alias);
    const active = body.active === undefined ? user.active : body.active;
    if (typeof active !== 'boolean') return fail('Invalid visibility.');
    await db.execute(
      sql`update players set alias = ${alias}, active = ${active} where id = ${user.id}::uuid`,
    );
    return c.json({ id: user.id, alias, active });
  });
  app.post('/api/practice', async (c) => {
    const body = await objectBody(c, ['ids', 'bankVersion']);
    if (body.bankVersion !== BANK_VERSION)
      return fail('Update the app to match this question bank.', 409);
    if (
      !Array.isArray(body.ids) ||
      body.ids.length < 1 ||
      body.ids.length > 8 ||
      !body.ids.every((id) => typeof id === 'string' && FAMILIES.some((f) => f.id === id)) ||
      new Set(body.ids).size !== body.ids.length
    )
      return fail('Choose 1–8 different question families.');
    const user = c.get('user'),
      now = clock();
    const refs = body.ids.map((id) => {
      const s = seed();
      return { id, seed: s, ticket: issueTicket(signingKey, user.id, id, s, now.getTime()) };
    });
    return c.json({ refs, bankVersion: BANK_VERSION });
  });
  app.post('/api/answers', async (c) => {
    const body = await objectBody(c, ['ticket', 'choice', 'assisted']);
    const user = c.get('user'),
      now = clock();
    let ticket: ReturnType<typeof verifyTicket>;
    try {
      ticket = verifyTicket(signingKey, body.ticket, user.id, now.getTime());
    } catch {
      return fail('That question ticket expired. Start a fresh lesson.', 403);
    }
    const q = makeQuestion(ticket.id, ticket.seed);
    if (
      typeof body.choice !== 'string' ||
      !q.choices.some((v) => v.value === body.choice) ||
      typeof body.assisted !== 'boolean'
    )
      return fail('Choose one of the available answers.');
    const correct = body.choice === q.expected,
      variant = digest(questionMaterial(q)),
      day = utcDay(now),
      week = weekKey(now);
    const receipt = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from players where id = ${user.id}::uuid for update`);
      const old = await tx.execute(
        sql`select wrong, assisted, solved from practice_attempts where player_id = ${user.id}::uuid and variant = ${variant} and day = ${day}::date`,
      );
      const previous = old.rows[0];
      if (previous?.solved) return { correct, xp: 0, capped: false, alreadySolved: true };
      const assisted = Boolean(
        body.assisted || previous?.assisted || Number(previous?.wrong ?? 0) > 0 || !correct,
      );
      await tx.execute(sql`insert into practice_attempts(player_id, variant, day, wrong, assisted, solved)
        values(${user.id}::uuid, ${variant}, ${day}::date, ${correct ? 0 : 1}, ${assisted}, ${correct})
        on conflict(player_id, variant, day) do update set wrong = practice_attempts.wrong + ${correct ? 0 : 1}, assisted = ${assisted}, solved = ${correct}`);
      if (!correct) return { correct, xp: 0, capped: false, alreadySolved: false };
      const first = await tx.execute(
        sql`insert into family_solves(player_id, family_id) values(${user.id}::uuid, ${q.id}) on conflict do nothing returning family_id`,
      );
      const rawXP = first.rows.length ? (assisted ? 10 : 20) : assisted ? 2 : 5;
      const total = await tx.execute(
        sql`select coalesce(sum(xp), 0)::int as xp from xp_events where player_id = ${user.id}::uuid and day = ${day}::date`,
      );
      const xp = Math.max(0, Math.min(rawXP, 500 - Number(total.rows[0].xp)));
      await tx.execute(
        sql`insert into xp_events(player_id, variant, day, week, xp) values(${user.id}::uuid, ${variant}, ${day}::date, ${week}::date, ${xp})`,
      );
      return { correct, xp, capped: xp < rawXP, alreadySolved: false };
    });
    return c.json(receipt);
  });
  app.post('/api/assessments', async (c) => {
    const body = await objectBody(c, ['bankVersion']);
    if (body.bankVersion !== BANK_VERSION)
      return fail('Update the app before starting an assessment.', 409);
    const user = c.get('user'),
      now = clock(),
      draft = newDraft(seed(), now);
    const saved = await db.execute(
      sql`insert into assessment_runs(player_id, bank_version, refs) values(${user.id}::uuid, ${BANK_VERSION}, ${JSON.stringify(draft.refs)}::jsonb) returning id`,
    );
    return c.json(
      { ...draft, id: String(saved.rows[0].id), remoteId: String(saved.rows[0].id) },
      201,
    );
  });
  app.post('/api/assessments/:id/finish', async (c) => {
    const body = await objectBody(c, ['answers']),
      user = c.get('user'),
      id = c.req.param('id'),
      now = clock();
    if (
      !/^[a-f0-9-]{36}$/.test(id) ||
      !Array.isArray(body.answers) ||
      body.answers.length !== 18 ||
      !body.answers.every((a) => typeof a === 'string' && a.length < 200)
    )
      return fail('Complete all 18 answers.');
    const result = await db.transaction(async (tx) => {
      const found = await tx.execute(
        sql`select bank_version, refs, result from assessment_runs where id = ${id}::uuid and player_id = ${user.id}::uuid for update`,
      );
      if (!found.rows.length) return fail('Assessment not found.', 404);
      const run = found.rows[0];
      if (run.result) return run.result as AssessmentResult;
      if (Number(run.bank_version) !== BANK_VERSION)
        return fail('This assessment uses an older bank. Start a fresh one.', 409);
      let graded: AssessmentResult;
      try {
        graded = gradeAssessment(
          run.refs as import('../src/content/bank').QuestionRef[],
          body.answers as string[],
          id,
          now.toISOString(),
          true,
        );
      } catch {
        return fail('An answer does not match this assessment.');
      }
      await tx.execute(
        sql`update assessment_runs set result = ${JSON.stringify(graded)}::jsonb, completed_at = ${now.toISOString()}::timestamptz where id = ${id}::uuid`,
      );
      return graded;
    });
    return c.json(result);
  });
  app.get('/api/boards', async (c) => {
    const user = c.get('user'),
      now = clock(),
      week = weekKey(now),
      resets = new Date(week + 'T00:00:00.000Z');
    resets.setUTCDate(resets.getUTCDate() + 7);
    const weekly = await db.execute(sql`with totals as (
      select p.id, p.alias, coalesce(sum(x.xp),0)::int as xp, null::int as score
      from players p left join xp_events x on x.player_id=p.id and x.week=${week}::date
      where p.active group by p.id, p.alias
    ), ranked as (select *, rank() over(order by xp desc)::int as rank from totals)
    select * from ranked where id=${user.id}::uuid or id in(select id from ranked order by xp desc, alias, id limit 50) order by xp desc, alias, id`);
    const skills = await db.execute(sql`with latest as (
      select distinct on(a.player_id) a.player_id, (a.result->>'score')::int as score
      from assessment_runs a where a.result is not null order by a.player_id, a.completed_at desc, a.created_at desc, a.id desc
    ), ranked as (
      select p.id,p.alias,0::int as xp,l.score,rank() over(order by l.score desc)::int as rank
      from latest l join players p on p.id=l.player_id where p.active
    )
    select * from ranked where id=${user.id}::uuid or id in(select id from ranked order by score desc, alias, id limit 50) order by score desc, alias, id`);
    const counts =
      await db.execute(sql`select (select count(*) from players where active)::int as weekly,
      (select count(distinct a.player_id) from assessment_runs a join players p on p.id=a.player_id where p.active and a.result is not null)::int as skills`);
    const board = (raw: Record<string, unknown>[], total: number): Board => {
      const rows = raw.map(parseRow);
      return { rows: rows.slice(0, 50), me: rows.find((r) => r.id === user.id) ?? null, total };
    };
    const result: Boards = {
      week,
      resetsAt: resets.toISOString(),
      fetchedAt: now.toISOString(),
      weekly: board(weekly.rows, Number(counts.rows[0].weekly)),
      skills: board(skills.rows, Number(counts.rows[0].skills)),
    };
    return c.json(result);
  });
  app.notFound((c) => c.json({ error: 'Route not found.' }, 404));
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error('TraceRace API error:', error.name);
    return c.json(
      { error: 'The league is taking a breather. Your local practice still works.' },
      500,
    );
  });
  return app;
}
