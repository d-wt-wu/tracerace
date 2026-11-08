import { defineConfig } from '@neon/config/v1';
export default defineConfig({
  functions: {
    traceraceapi: {
      name: 'TraceRace rankings and assessment API',
      source: 'server/function.ts',
      env: {
        TRACERACE_SIGNING_KEY: process.env.TRACERACE_SIGNING_KEY!,
        TRACERACE_AUTH_SECRET: process.env.TRACERACE_AUTH_SECRET!,
        TRACERACE_AUTH_URL: process.env.TRACERACE_AUTH_URL!,
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? {
              GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
              GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            }
          : {}),
        ...Object.fromEntries(
          [
            'TRACERACE_WEB_ORIGIN',
            'TRACERACE_SMTP_HOST',
            'TRACERACE_SMTP_PORT',
            'TRACERACE_SMTP_SECURE',
            'TRACERACE_SMTP_USER',
            'TRACERACE_SMTP_PASSWORD',
            'TRACERACE_MAIL_FROM',
          ]
            .filter((key) => process.env[key])
            .map((key) => [key, process.env[key]!]),
        ),
      },
    },
  },
});
