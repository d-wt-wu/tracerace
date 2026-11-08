# Web beta

Published and verified November 8, 2026: [TraceRace web beta](https://tracerace.onrender.com/). [Release evidence](evidence/web-beta.json) records checks and limitations.

Google sign-in, sign-out and returning sign-in passed at the public origin. The owner’s previous practice was carried into a private beta account after matching the Google provider identity; the development save was unchanged. Google’s audience is In production, with the final callback, homepage and privacy URL registered. The public API rejected password signup and passed disposable-fixture tests for secure sessions, private profiles, cloud save/read, stale-revision rejection, sign-out revocation and deletion cascades. All fixture records were removed.

The deployed code is commit `39a41a0201129e4652386f2005a52aa465dbcbc8`. Its [GitHub checks](https://github.com/d-wt-wu/tracerace/actions/runs/42530175907) passed: 111 unit/content/regression tests, 22 real PostgreSQL API tests, typecheck, lint, safe C comparisons and a web export. Native JavaScript exports also passed; no native binary or store submission was made. A 390px desktop browser viewport had no horizontal page overflow. Actual iPhone/Android testing and external tester feedback remain outstanding.

## Shape of the release

One Render Node web service hosts the Expo export and the Hono/Better Auth API. Browser cookies stay on the app's own HTTPS origin. Neon stores persistent records in the isolated `beta-web` branch of the existing TraceRace project, in AWS US East (Ohio). Development remains on `dev-accounts`; main was not accessed or activated.

`render.yaml` selects a Free service in Ohio, a locked dependency install, a release web export, a process-only `/health` probe, and manual deploys. The probe does not keep PostgreSQL awake. Render's Free services sleep while idle and share the workspace's monthly allowance with Know Your Commute. There is no paid instance, persistent disk, extra Render database, or purchased domain in this configuration.

The runtime database role can read and update app tables and use their sequences. It cannot create tables or manage roles. The owner connection and backup key stay on the owner's Mac and are never part of the Render runtime or source repository. Apply future migrations with an owner connection, then explicitly grant the runtime role access to any new tables.

## Build and run

```sh
npm ci --include=dev
npm run build:web:release
npm run serve:web
```

The export sets only the public web API mode to `same-origin`. Expo dotenv loading is disabled for the release export. The server uses `RENDER_EXTERNAL_URL` as its public origin; `TRACERACE_PUBLIC_URL` overrides it for an explicit deployment or isolated local QA. Server credentials are never EXPO_PUBLIC values.

Required runtime keys: `DATABASE_URL`, `TRACERACE_AUTH_SECRET`, `TRACERACE_SIGNING_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Set `NODE_VERSION=22`, `TRACERACE_MODE=beta` and `TRACERACE_EMAIL_AUTH_ENABLED=false` for the first beta. Register the deployment's exact `/api/auth/callback/google` URI in the owner's Google client. Verify its audience, homepage, support and privacy URLs before inviting testers. Do not claim Google is live on a new host just because initialization succeeds.

The web adapter removes caller-supplied rate-limit identity. Only on Render does it use a validated last forwarding hop from Render's forwarding header. Authentication limits remain database-backed and conservative; this is not a claim of a custom WAF or comprehensive DDoS protection.

## Recovery

App-data backups use AES-256-GCM with a separate private key. They contain account and practice records and must stay private even when encrypted. Keep the key, owner connection and auth secret separately in a secure password manager; this repository contains key names and recovery code only.

```sh
node --env-file=.env.beta-owner --import tsx scripts/backup.ts capture work/backups/beta.enc
node --env-file=.env.restore-owner --import tsx scripts/backup.ts restore work/backups/beta.enc
```

Capture is transactionally consistent. Restore requires an empty `restore-check-*` target and matching migration hashes; it never overwrites an existing account database. Sessions, verification tokens, quotas and rate-limit records are deliberately excluded from restoration. Users must sign in again after recovery. Before promoting a restored database, reapply any deletions made since the backup and verify account ownership and privacy choices. Schema recovery uses versioned migrations; these app-data files are not full PostgreSQL system backups. A separate scheduled backup service is not configured.

A schema-only branch also has empty migration metadata. Its baseline must be checked against the source SQL hashes and populated with the verified migration journal before future migrations are applied. Do not rerun the initial CREATE TABLE migrations over an already copied schema.

## Checks before inviting testers

- Public root, direct lesson links, privacy and support pages load over HTTPS.
- The manifest and app icon return their intended content types. No service worker caches private API responses.
- Unknown API paths return JSON errors; missing assets and dotfiles never receive the app shell.
- Password signup is actually rejected by the server, not just hidden by the UI.
- Google consent/callback, cancellation, reload, sign-out and returning sign-in work at the final origin.
- A disposable account can save progress, hide rankings, and delete its account and synced records.
- A completed daily session changes the next picks, avoids recent variants, and follows the existing XP rules.
- Real iPhone Safari and Android Chrome behavior is checked by a human. A resized desktop screenshot does not satisfy this item.

## First tester session

Ask 5–10 volunteers to open the app without coaching, complete a short session, try an assessment, and return later in the week. Record device/browser, where they needed help, confusing questions, and any lost or duplicated progress. Compare later-variant understanding rather than repeated taps. This is a proposed test protocol, not a claim that users have been recruited or retention measured. The beta does not collect product analytics.

## References

- [Render Node hosting](https://render.com/docs/deploy-node-express-app)
- [Render Free limits](https://render.com/docs/free)
- [Render client-IP and edge protection](https://render.com/articles/how-render-handles-ddos-attacks)
- [Expo home-screen metadata](https://docs.expo.dev/guides/progressive-web-apps/)
