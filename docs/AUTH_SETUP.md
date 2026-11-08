# Account setup

## Current status

Email/password accounts, sessions, private cloud progress, optional guest import, profile settings, sign-out, and deletion are implemented. The owned Google web OAuth client is configured in the private server environment and the HTTPS development Function. Local and HTTPS authorization initialization passed with the correct callbacks, S256 PKCE, and only email/profile/openid scopes. On November 8, 2026, the owner completed Google consent and the local browser callback. The app showed account sync on and retained the original 20 XP after a reload. Apple is deferred at the owner's request. Password recovery and verification emails require an SMTP service and are currently unavailable.

The account backend is on the isolated `dev-accounts` branch. Keep main separate. Existing private `.env.local` values are already present on the owner's Mac and must not be shared or committed.

## Connect Google

1. Open [Google Cloud Console](https://console.cloud.google.com/auth/clients) and select or create a project for TraceRace.
2. Configure the Google Auth Platform app name and audience. If the app is in testing, add the intended testers through Google's audience settings.
3. Create an OAuth client with application type **Web application**. The backend handles Google's callback for both web and native clients.
4. Add the redirect URI `http://localhost:8787/api/auth/callback/google` for the current browser preview. Add the development Function's `/api/auth/callback/google` URL when testing native clients against that deployment; it is listed below.
5. Download the client JSON. The client ID and secret go into the private server `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. A downloaded JSON file can be imported with help without pasting its secret into chat. Do not use an EXPO_PUBLIC name for a secret.
6. Restart `npm run api`. For the HTTPS development Function, deploy the reviewed source to `dev-accounts` using `neon deploy --env .env.local`. The existing `neon.ts` includes Google credentials only when both values are configured.
7. Test Google sign-in, cancellation, reload, sign-out, and returning to the same profile. A configured button is not evidence of a completed OAuth test.

Register the exact callback of a later public frontend/auth proxy when that deployment is chosen. Keep browser auth same-site; the current separate-domain Neon Function URL is directly suitable for native cookie storage, not an assurance that every browser permits third-party cookies.

Development Function callback: `https://br-quiet-night-bdy1pxnj-traceraceapi.compute.c-8.us-east-2.aws.neon.tech/api/auth/callback/google`

## Account emails

Configure these private server variables with an owned mail service:

- `TRACERACE_SMTP_HOST`, `TRACERACE_SMTP_PORT`, and `TRACERACE_SMTP_SECURE`.
- `TRACERACE_SMTP_USER`, `TRACERACE_SMTP_PASSWORD`, and `TRACERACE_MAIL_FROM`.

The default port is 465 with TLS. Configure the provider's verified sender and TLS settings. Both recovery and verification turn on when the required mail settings are present. Sign-up then requires email verification; recovery resets revoke older sessions. Use a real mailbox you control to test delivery and expired/invalid links before a beta. No verification or recovery emails were sent during this build's reserved-address tests.

Enabling verification later does not retroactively make existing development emails verified. Treat development test accounts accordingly.

## Storage and ownership

- A guest's original local save remains under `@tracerace/progress/v1`.
- Signed-in device saves are scoped by backend and user ID.
- New accounts can copy guest practice during onboarding. Existing account history is never silently replaced by a guest save.
- Completed practice is backed up with optimistic revisions. If another device has changed it, Settings offers an explicit choice. The prior copy is kept on the device.
- Haptics and unfinished assessment drafts stay device-specific.
- Local practice XP is not accepted as verified leaderboard XP.
- New profiles opt out of public ranking visibility unless the user chooses to join.
- Claiming a valid guest ranking profile preserves its server records and revokes the old guest ticket.
- Account deletion removes account sessions, provider accounts, cloud progress, and ranking data through database cascades. Original guest progress and copies on other devices remain local until cleared.

## Native flow

The client uses the documented `@better-auth/expo` plugin with Expo SecureStore. Native requests include its session cookie and the `tracerace://` origin. Google uses the system auth browser and returns through that app scheme. Browser requests use `credentials: include` and HttpOnly cookies.

Phone behavior, the native Google callback, and Google returning-sign-in/sign-out still need release-device testing. The local browser Google consent, callback, and session reload have been verified. No IPA, APK, TestFlight release, or store submission is included. See [release plan](RELEASE_PLAN.md) for the remaining publishing work.

## Sources

- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo)
- [Better Auth Google provider](https://better-auth.com/docs/authentication/google)
- [Better Auth Hono integration](https://better-auth.com/docs/integrations/hono)
- [Managed Auth supported plugins](https://neon.com/docs/auth/guides/plugins)
- [Better Auth account deletion](https://better-auth.com/docs/concepts/users-accounts)
