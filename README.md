# TraceRace

Short CS challenges, visual C traces, and a slightly ridiculous rank ladder. Built by Wentao Wu with React Native, Expo SDK 57, TypeScript, Better Auth, Hono, Drizzle, and Lakebase Postgres on Neon.

**Try the web beta:** [tracerace.onrender.com](https://tracerace.onrender.com/). Google sign-in and guest practice are available. Free hosting may need time to wake after inactivity.

## Web beta work in v0.4

- Personalized three-question sessions combine overdue reviews with a new concept, using fresh variants. Early independent practice preserves the existing review interval; help brings the concept back sooner.
- A same-origin Node web server serves the Expo app and account API at one address. Public privacy and support pages load without signing in.
- The public beta configuration offers Google and guest use. Password accounts remain available in development; verification/recovery delivery is required before broad password registration.
- Beta data is isolated from development, with a restricted runtime database role. Encrypted app-data backups can be restored only to an empty, isolated restore-check target.
- Home-screen metadata and a standalone manifest are included. This web beta requires a connection to load; it does not cache account responses or promise offline installation.

See [web release](docs/WEB_RELEASE.md) for deployment instructions and verified release status. The Render configuration selects Free hosting; no custom domain or store purchase is needed for this beta.

## Run the development preview

Use Node.js 22 or newer. The owner's development checkout has a private `.env.local` with the development database and account settings. A fresh clone needs its own server environment.

```sh
npm ci
cp -n .env.example .env.local
npm run api
```

In a second terminal:

```sh
npm run web -- --localhost --port 8081
```

Open http://localhost:8081/. The browser uses http://localhost:8787 for the API. Keep both on localhost so browser session cookies work. A separate source copy is used for isolated browser QA, because concurrent Metro servers sharing a source directory can reuse environment-specific transforms.

The example configuration contains public endpoints only. A fresh checkout needs its own server environment before `npm run api` will work. Never replace the private environment with the example. The HTTPS development Function is configured for native clients; a hosted web release needs a same-site API or auth proxy and an explicitly trusted web origin.

## What is included in v0.3

- A new home layout with a lesson hero, daily activity, mixed practice, review shortcuts, and profile access.
- Email/password sign-up and sign-in, session restoration, sign-out, and account deletion.
- Google sign-in configured with an owned development OAuth client, on the local API and HTTPS development Function. The owner completed Google consent and the local browser callback on November 8, 2026. The signed-in session survived a reload, with the previous practice save preserved. The native callback remains unverified. Apple sign-in is deferred at the owner's request.
- Onboarding with a public nickname, private ranking visibility by default, and optional guest-progress import.
- Account-specific device caches and automatic cloud backups of completed practice. Conflicting saves ask which copy to keep. Haptics and unfinished assessments stay with their device.
- Profile editing, account sync status, ranking visibility, haptics, reset/restore, privacy information, and deletion controls in Settings.
- Password recovery and email-verification delivery supported when an SMTP service is configured. These emails are not enabled in the current development preview.
- Guest practice remains available, and the original local progress key is preserved.

The existing learning features remain: 36 original question families across nine units; Easy/Medium/Hard labels and reusable seeded variants; hints and explanations; a bounded C visualizer; weekly server-verified XP rankings; and a separate 18-question weighted skill assessment.

## Verify

```sh
npm run check
npm run test:api
```

`check` runs formatting, TypeScript, unit/content/regression tests, 36 safe C variant comparisons against clang C17, lint, and a production web export. The three undefined-behavior C families are teaching-model tests and are never executed as native C.

API tests require a migrated development database. They refuse `main`, exercise real PostgreSQL and real Better Auth sessions, and remove only their own test records. They cover ownership, conflicting saves, guest-ticket revocation, deletion cascades, concurrency, scoring, and generated SQL against PostgreSQL.

The GitHub check workflow is prepared. A local pass is not a claim that remote CI ran.

## Accounts and the backend

Better Auth 1.7.18 runs inside the existing Hono API with its matching Expo plugin. Managed Auth was evaluated first; its supported plugin set does not include the required Expo integration. No existing managed accounts were migrated. The app keeps its Neon database and Function.

The current working branch is `dev-accounts`, copied from `dev-ranks`. Main was not accessed or activated. Schema changes are versioned in `server/db/migrations`.

Browser sessions use HttpOnly cookies. Native cookies use the Expo integration and SecureStore. The API checks server sessions and account ownership. Guest ranking tickets remain supported; claiming a guest profile rotates its old ticket. Account deletion cascades account progress and ranking records. Passwords are hashed by Better Auth, rather than by application code.

The account secret, database URLs, OAuth secret, and optional mail credentials are server-only. Only EXPO_PUBLIC variables belong in the app bundle. The source archive omits local environments and installed dependencies.

See [account setup](docs/AUTH_SETUP.md) for Google and email delivery, [release plan](docs/RELEASE_PLAN.md) for publishing gates and costs, [rankings](docs/RANKINGS.md) for scoring and privacy, and [engine limits](docs/ENGINE.md) for the C teaching model.

## Phone testing and release status

The browser preview runs on this Mac. It is not an App Store release. Test the new flows on actual iOS and Android devices before a beta. Social sign-in uses the `tracerace://` callback and needs a compatible development build; Expo Go is not the social-sign-in release path.

Use the current [Expo setup guide](https://docs.expo.dev/get-started/start-developing/) and [development build guide](https://docs.expo.dev/develop/development-builds/introduction/). Do not create ios/ or android/ by hand.

The current email-account mode is for development. Configure verification/recovery email, final Google callbacks, trusted production origins, and a deployment-specific trusted client-IP policy before opening account registration broadly. The default auth limiter falls back to a shared per-path budget when the runtime has no trusted IP header; it is not an edge DDoS control.

## Attribution and limits

All lesson content and the C interpreter are original. Difficulty is curated, not calibrated. Skill titles describe a short practice assessment, not a percentile or job qualification. Fixed-concept questions can repeat; shuffled choices do not create a new concept or a new XP reward.

The C trace models supported examples, not all of C. Addresses are illustrative, integers are 32-bit, and allocation is assumed to succeed. Non-C questions are labelled separately.

`vendor/decode-uri-component` retains the upstream MIT-licensed 0.5.1 decoder with its ESM default export converted to CommonJS for SDK 57's Router. Other overrides select patched glob, minimatch, and migration-tool esbuild versions. The decoder and authentication libraries are third-party code, separate from the original interpreter.
