# TraceRace release plan

Reviewed November 8, 2026. This is a release plan, not evidence that a public deployment or store submission exists.

## Verified now

- Google consent and the callback completed in the local browser. The session survived a reload, with 20 XP and one completed family preserved.
- The local API and HTTPS development Function initiate Google authorization with the intended client, exact callback, S256 PKCE, and email/profile/openid scopes.
- The account-owning Neon organization is on the Free plan, checked through the CLI. No plan upgrade was made.
- Earlier v0.3 validation passed 100 unit/content/regression tests and 22 real PostgreSQL API tests. These were not all rerun for the documentation update.
- The frontend remains a Mac-hosted development preview; the backend remains on `dev-accounts`. Main was not accessed or activated.

## Recommended order

1. **Publish a mobile web beta.** Use a stable HTTPS frontend URL and a same-origin `/api` deployment or reviewed auth proxy. Configure the final Better Auth base URL, trusted web origin, and exact Google callback together. The existing separate-domain Function URL alone does not solve browser cookie restrictions. A provider subdomain is enough initially; buying a domain is optional.
2. **Separate release data from development.** Prepare a dedicated release environment with migrations, server-only credentials, a tested backup/restore procedure, and documented rollback. Do not repurpose or reset the current signed-in development account. Review the target environment before deploying.
3. **Finish account operations.** Enable and test verification/recovery email before broadly offering password accounts, or explicitly scope the beta to Google and guest use. Test Google cancellation, sign-out, returning sign-in, expiry, and account collisions on the final deployment. Do not imply that automatic account linking exists.
4. **Prepare public information.** Publish an accurate privacy policy and support contact. Describe the provider data stored, storage region, retention and deletion behavior. Verify account deletion using disposable test accounts, including synced progress and ranking removal.
5. **Test actual phones.** Test the public web beta in iPhone Safari and Android Chrome: first lesson, assessment resume, Google redirect, keyboard, text scaling, slow network, interrupted save, reconnect, and private/public ranking controls. Add home-screen install metadata if shipping an installable web app; this is not implemented yet. Never cache account/API responses in an offline shell.
6. **Invite 5–10 UTSC testers.** Ask them to complete a session unaided and return during the following week. Record bugs and feedback. If adding product metrics, first document the collection and minimize personal data. Measure first-session completion, repeat practice, and review accuracy; these are proposed metrics, not measured results.
7. **Choose a store after the beta.** Add stable application identifiers and an Expo build configuration, create signed development/release builds, and test native Google redirects and account sync on devices. Prepare icons, screenshots, age/content rating, privacy disclosures, support links, and reviewer access. No store accounts or paid memberships are required for the web beta.

## Improvements with the most value

Prioritize a short daily practice session built from missed or weak concepts, followed by spaced review with fresh variants. Measure improvement on later variants rather than treating repeated taps as mastery. Keep the assessment rank separate from weekly practice XP, and describe assessment results as practice indicators rather than professional qualifications.

Use testers to find confusing questions and balance difficulty. Then measure release-build startup time, lesson interaction responsiveness, and save requests before optimizing them. Avoid adding more ranking systems or expanding the question count until the core practice loop is useful.

## Cost boundaries

- The current Neon organization is Free. Database, Function, and traffic allowances are finite. Recheck usage before launch and keep paid upgrades explicit.
- Expo offers a Free plan with limited builds, updates, and hosting allowances. A web beta can start on a free provider URL within provider limits.
- Google OAuth for the existing sign-in integration does not require buying an Apple membership or an Expo subscription. No paid Google Identity Platform product was configured by this work.
- Apple Developer Program distribution is USD 99 per year, with local pricing where available. Google Play registration is USD 25 once. Taxes and regional pricing may apply.
- Apple sign-in remains deferred. For an iOS App Store build retaining Google as a primary login, Apple's guideline 4.8 requires an equivalent privacy-preserving login option unless an exception applies. Sign in with Apple is the straightforward route; the current email/password login does not supply a private email relay. Another route is an iOS build using only the app's own account system, after recovery/verification are ready.

## Current references

- [Neon pricing](https://neon.com/pricing)
- [Expo pricing](https://expo.dev/pricing)
- [Expo web publishing](https://docs.expo.dev/eas/hosting/get-started/)
- [Expo progressive web apps](https://docs.expo.dev/guides/progressive-web-apps/)
- [Google OAuth setup](https://developers.google.com/identity/openid-connect/openid-connect)
- [Apple login services guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services)
- [Apple membership fee](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Google Play registration](https://support.google.com/googleplay/android-developer/answer/6112435)
