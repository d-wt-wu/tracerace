# TraceRace build plan

## v0.1 — complete

The original local learning loop: 15 C questions, four units, original code-native art, a bounded interpreter and memory visualizer, saved progress, XP, streaks, and spaced review.

## v0.2 — implemented

- 36 original question families across nine units.
- Seeded question variants, independent C answer formulas, randomized answer order, and curated Easy/Medium/Hard labels.
- Difficulty filters and mixed practice.
- A weekly shared XP board with seven funny league tiers.
- A separate shared skill board based on the latest ranked assessment.
- Balanced 18-question assessments, three difficulty levels across six areas, with draft/resume, skips, weighted scoring, topic feedback, and answer review.
- Anonymous optional enrollment, native secure device-ticket storage, ranking visibility controls, and owner-scoped API access.
- Hono API, Drizzle migrations, Lakebase Postgres, and a persistent Neon Function on the isolated dev-ranks branch.
- Atomic and idempotent XP awards, signed question tickets, per-day deduplication, a daily league cap, and server assessment grading.
- v0.1 learning-save migration.
- Local/API regression tests, independent compiler and SQL checks, and a CI workflow with a disposable PostgreSQL service.

There are no invented players on the boards. QA accounts are hidden or removed. Main activation was not performed after automatic approval review blocked its credential retrieval; the working preview uses the approved development backend.

## Next: phone testing and student feedback

Test the native build on Wentao's phone, including secure storage, haptics, navigation, assessment resume, and network loss. JavaScript export checks do not replace native hardware testing.

Then give the first flow to 5–10 reachable UTSC students. Record actual completion, confusing questions, use of explanations, and whether people return on a different day. No download or retention metrics have been invented.

Use those observations to choose the next addition: better questions, more algorithm families, friend challenges, or an improved review schedule.

## Before broader distribution

- Decide on account recovery and cross-device progress.
- Improve abuse resistance for anonymous enrollment and scripted answering.
- Calibrate difficulty using real response data, with consent and a clear measurement design.
- Preserve historical assessment content when changing bank semantics.
- Review privacy disclosures, accessibility on devices, support, and store assets.
- Choose a production deployment and authorize its setup.
- Use a signed development/TestFlight build before App Store submission.

No membership purchase or App Store submission has been performed.

## v0.3 accounts and interface

Implemented email accounts, the Expo-compatible Better Auth server/client integration, private profile setup, cloud save revisions and conflict controls, guest import and ticket claim, account settings/deletion, and redesigned home/profile/auth screens. The working branch is dev-accounts. Google needs an owned OAuth client; Apple is deferred. SMTP verification/recovery and actual phone testing remain before a public beta. See AUTH_SETUP.md.
