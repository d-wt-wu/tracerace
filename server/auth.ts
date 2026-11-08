import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import nodemailer from 'nodemailer';
import * as schema from './db/auth-schema';
import { nativeOrigin, webOrigins } from './origins';
import type { AuthCapabilities } from '../src/domain/account';
export function authCapabilities(): AuthCapabilities {
  const mail = !!(
    process.env.TRACERACE_SMTP_HOST &&
    process.env.TRACERACE_SMTP_USER &&
    process.env.TRACERACE_SMTP_PASSWORD &&
    process.env.TRACERACE_MAIL_FROM
  );
  return {
    email: process.env.TRACERACE_EMAIL_AUTH_ENABLED !== 'false',
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: false,
    recovery: mail,
    verification: mail,
  };
}
export function createAuth(
  pool: Pool,
  secret: string,
  baseURL: string,
  settings: { rateLimit?: boolean } = {},
) {
  if (secret.length < 32)
    throw new Error('An account signing secret of at least 32 characters is required.');
  const capabilities = authCapabilities();
  const mailer = capabilities.recovery
    ? nodemailer.createTransport({
        host: process.env.TRACERACE_SMTP_HOST,
        port: Number(process.env.TRACERACE_SMTP_PORT || 465),
        secure: process.env.TRACERACE_SMTP_SECURE !== 'false',
        auth: {
          user: process.env.TRACERACE_SMTP_USER!,
          pass: process.env.TRACERACE_SMTP_PASSWORD!,
        },
      })
    : null;
  async function send(to: string, subject: string, message: string, url: string) {
    if (!mailer) throw new Error('Account email is not configured.');
    await mailer.sendMail({
      from: process.env.TRACERACE_MAIL_FROM!,
      to,
      subject,
      text: message + '\n\n' + url + '\n\nIf you did not request this, ignore this email.',
    });
  }
  return betterAuth({
    appName: 'TraceRace',
    secret,
    baseURL,
    basePath: '/api/auth',
    database: drizzleAdapter(drizzle(pool), { provider: 'pg', schema }),
    trustedOrigins: [...webOrigins(), nativeOrigin],
    plugins: [expo()],
    emailAndPassword: {
      enabled: capabilities.email,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: capabilities.verification,
      ...(capabilities.recovery
        ? {
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
              await send(
                user.email,
                'Reset your TraceRace password',
                'Choose a new password for your TraceRace account.',
                url,
              );
            },
            revokeSessionsOnPasswordReset: true,
          }
        : {}),
    },
    ...(capabilities.verification
      ? {
          emailVerification: {
            sendOnSignUp: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await send(
                user.email,
                'Verify your TraceRace email',
                'Confirm your email to finish setting up TraceRace.',
                url,
              );
            },
          },
        }
      : {}),
    socialProviders: capabilities.google
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
      cookieCache: { enabled: false },
    },
    user: { deleteUser: { enabled: true } },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-tracerace-client-ip'] },
      cookiePrefix: 'tracerace',
      useSecureCookies: baseURL.startsWith('https://'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    rateLimit: {
      enabled: settings.rateLimit !== false,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 8 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    telemetry: { enabled: false },
  });
}
export type AccountAuth = ReturnType<typeof createAuth>;
