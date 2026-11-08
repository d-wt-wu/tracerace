export function databaseURL(value: string | undefined): string {
  if (!value) throw new Error('A database connection URL is required.');
  const url = new URL(value);
  if (url.hostname.endsWith('.neon.tech')) url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
