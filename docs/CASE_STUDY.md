# TraceRace: small CS practice, with the reasoning visible

[Try the public beta](https://tracerace.onrender.com/) · [Source](https://github.com/d-wt-wu/tracerace) · Built by Wentao Wu

## The problem

Practicing computer science on a phone often means reading an explanation or trying to type into a small editor. TraceRace explores another format: predict an answer, inspect a short execution trace, and revisit the concept in a fresh variation. The goal is a usable practice loop, with enough engineering underneath to explain how it behaves when accounts, concurrent requests, or network failures are involved.

## What shipped

A public web beta with 36 question families in nine units; seeded Easy/Medium/Hard variants; a visual C teaching interpreter; personalized three-question review sessions; an 18-question assessment; optional weekly rankings; Google accounts; and private cloud progress with conflict resolution and account deletion. Guest practice is available without registration.

The client uses React Native, Expo SDK 57, Expo Router, and TypeScript. A Node server hosts the web export and Hono API on the same origin. Better Auth handles accounts, and Drizzle migrations describe the PostgreSQL schema on Neon. Render Free hosts the beta; GitHub Actions checks the public source.

## Decisions worth discussing

### Model execution instead of running arbitrary C

The [teaching interpreter](../src/engine/c.ts) tokenizes reviewed snippets, uses a Pratt parser for expressions, and evaluates statements against explicit bindings and memory blocks. Each step copies a snapshot, so moving backward through a trace cannot rewrite an earlier state. A pointer stores a block and element position; the UI supplies illustrative addresses.

This makes aliasing, one-past pointers, lifetime errors, and uninitialized reads visible without actually performing invalid memory accesses. The trade-off is a deliberately small language subset. Unsupported constructs are rejected, and fault lessons describe undefined behavior rather than predicting a real program's output. [Supported model and limits](ENGINE.md).

### Treat score submission as a server decision

The client question bank is public, so hiding correct answers in the app would not protect rankings. Instead, expiring signed question tickets bind each online attempt to a player, family, seed, and bank version. The server recreates the question and grades the answer. Database locks and uniqueness constraints prevent concurrent retries from awarding duplicate XP.

This protects the integrity of the app's scoring rules. It does not make the assessment cheat-proof or establish one human per account. [Scoring and privacy rules](RANKINGS.md).

### Keep private progress separate from public rankings

Guest practice stays on the device. Signed-in practice can sync privately, while public nickname/ranking visibility remains optional. Cloud writes include a revision; a stale save produces a conflict that the user resolves, instead of silently overwriting another device's progress. Haptics and unfinished assessments remain device-specific.

Browser accounts use HttpOnly cookies on the same HTTPS origin as the app. The runtime database role cannot create tables or manage roles. Secrets and owner connections stay outside the client bundle and repository.

### Check recovery, not just successful writes

Backups capture app records consistently and encrypt them with AES-256-GCM using a separate private key. Restore refuses a nonempty target or an unapproved branch name, and checks migration hashes before writing. Session and verification records are omitted so recovery does not resurrect old sessions. A restore round trip was checked across eight persistent tables on an isolated branch, then the temporary branch was removed.

## Evidence

The [deployed code's CI run](https://github.com/d-wt-wu/tracerace/actions/runs/42530175907) passed 111 unit/content/regression tests and 22 PostgreSQL API tests. Independent checks compare 36 sampled defined-behavior C variants with clang C17; generated SQL is checked against real PostgreSQL. Public-origin checks cover Google login, logout, returning sessions, secure cookies, private profiles, cloud conflicts, and deletion cascades. See the [machine-readable release evidence](evidence/web-beta.json) and [release notes](WEB_RELEASE.md).

These counts describe implemented coverage. They do not imply complete C compatibility, calibrated skill measurement, or demonstrated learning gains.

## Current limits and next evidence

The beta runs on free infrastructure, so an idle server can take about a minute to wake. Real iPhone/Android testing, outside tester feedback, and measured returning use are still outstanding. There is no App Store release and no product analytics collecting retention metrics.

The next useful validation is a small voluntary tester group: observe a first session without coaching, record confusing questions and lost progress, then check whether people return and understand a fresh variant. That would test the product's usefulness separately from the implementation checks already in CI.
