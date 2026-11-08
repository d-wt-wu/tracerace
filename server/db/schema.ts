import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  primaryKey,
  uniqueIndex,
  index,
  check,
  text,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
export * from './auth-schema';
import type { Progress } from '../../src/state/progress';
import type { QuestionRef } from '../../src/content/bank';
import type { AssessmentResult } from '../../src/domain/assessment';
export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  alias: varchar('alias', { length: 20 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  authUserId: text('auth_user_id')
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const familySolves = pgTable(
  'family_solves',
  {
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    familyId: varchar('family_id', { length: 80 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.familyId] })],
);
export const practiceAttempts = pgTable(
  'practice_attempts',
  {
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    variant: varchar('variant', { length: 64 }).notNull(),
    day: date('day').notNull(),
    wrong: integer('wrong').notNull().default(0),
    assisted: boolean('assisted').notNull().default(false),
    solved: boolean('solved').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.variant, t.day] })],
);
export const xpEvents = pgTable(
  'xp_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    variant: varchar('variant', { length: 64 }).notNull(),
    day: date('day').notNull(),
    week: date('week').notNull(),
    xp: integer('xp').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('xp_once_per_variant_day').on(t.playerId, t.variant, t.day),
    index('xp_by_week_player').on(t.week, t.playerId),
    check('bounded_xp', sql`${t.xp} >= 0 and ${t.xp} <= 20`),
  ],
);
export const assessmentRuns = pgTable(
  'assessment_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    bankVersion: integer('bank_version').notNull(),
    refs: jsonb('refs').$type<QuestionRef[]>().notNull(),
    result: jsonb('result').$type<AssessmentResult>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('assessment_latest_player').on(t.playerId, t.completedAt)],
);
export const quotas = pgTable('api_quotas', {
  key: varchar('key', { length: 160 }).primaryKey(),
  count: integer('count').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const cloudProgress = pgTable('cloud_progress', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  progress: jsonb('progress').$type<Progress>().notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
