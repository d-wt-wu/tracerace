# Rankings and assessment

TraceRace has two separate progress systems.

## Weekly league

The shared board sorts server-verified weekly XP. XP thresholds give the funny league title: Potato Division, Keyboard Gremlins, Rubber Duck Council, Semicolon Society, Merge Conflict Club, Big-O Goblin Guild, and Production Wizards.

New question families earn 20 XP independently or 10 with help. Different variants of a known family earn 5 or 2. Identical problem content counts once per UTC day, regardless of answer order or distractors. The server remembers incorrect attempts and caps league XP at 500 per UTC day.

The week resets Monday at 00:00 UTC. Equal XP shares a competition rank. The server computes ranks before selecting the top 50 and separately returns the player's position. This is a weekly board with XP tiers; there are no invented cohort members or promotion-zone claims.

Local learning XP remains useful offline. League XP starts with server-issued online practice after joining; previous local XP is not uploaded as a claimed score.

## Skill assessment

Each attempt contains 18 questions: one easy, medium, and hard item in each of six areas:
C and memory, algorithms, data structures, time complexity, SQL, and systems reasoning.

Easy answers count for 1 point, medium for 2, and hard for 3. Each topic has 6 possible points; the whole assessment has 36. The displayed score is rounded to a percentage. Skips count as incorrect. Explanations appear after submission, and an unfinished attempt can resume on this device.

The latest completed ranked assessment determines the shared skill-board position, including when the new score is lower. XP does not affect this score. A device-only assessment gives a local title and topic breakdown, without adding a shared-board entry.

Titles are Baby Byte, Keyboard Toddler, Semicolon Middle Schooler, Bug Wrangler, Junior SWE Energy, Big-O Goblin, and Compiler Whisperer. These are playful snapshots of this short assessment. Difficulty is curated, not calibrated; the result is not a percentile or an employment qualification.

## API and persistence

Hono exposes an authenticated API on a Neon Function, with Lakebase Postgres, Drizzle schema, and versioned migrations. The pool is reused and idle disconnects are handled. Neon URLs explicitly use certificate-verifying TLS.

Joining is optional and asks for a public nickname. A random device credential is issued once, hashed in the database, and checked on API requests. Guest tickets use Expo SecureStore on native clients and origin-scoped local storage in browsers. Account sessions use the Expo auth plugin with SecureStore on native clients and HttpOnly browser cookies. Guest tickets are device-specific. An account can claim a guest profile during onboarding; the old ticket is then revoked. Signed-in profiles use Better Auth server sessions. Password recovery requires the optional mail service described in AUTH_SETUP.md.

The nickname, XP, and latest ranked score are visible after joining. Ranking visibility can be paused and restored. Assessment details are scoped to their owner. Resetting local learning progress does not reset verified server results.

Question tickets bind the player, question family, seed, bank version, and a two-hour expiry with HMAC. The server grades the selected answer, rather than accepting an XP or rank number. Row locks and uniqueness constraints make concurrent correct submissions idempotent.

This is a low-volume development build, not a cheat-proof examination. The original question bank also runs offline in the client. Anonymous registration, a persistent enrollment budget, and per-player request limits reduce routine abuse; they do not establish one-human-one-account or provide edge DDoS protection. Broader public distribution should add account recovery and appropriate abuse controls.

## Deployment scope

The v0.3 account preview uses the isolated dev-accounts branch, copied from dev-ranks, in the new TraceRace Neon project. It is a persistent, signed-in account project, not an expiring claimable database.

The main branch has not been migrated or activated. Automatic approval review rejected retrieving its connection secret as outside the development-only scope. The approved development backend supplies the working shared rankings.

Test profiles are hidden or removed. No generated competitors appear on the board. API integration tests delete only their own records and refuse the main branch.

## Sources

- [Expo SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Neon Functions](https://neon.com/docs/compute/functions/overview)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [PostgreSQL COUNT semantics](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [PostgreSQL outer joins](https://www.postgresql.org/docs/current/tutorial-join.html)
