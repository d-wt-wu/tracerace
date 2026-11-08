export function googleRedirectURL(value: unknown, apiOrigin: string): string {
  if (typeof value !== 'string') throw new Error('Google sign-in could not be started. Try again.');
  const url = new URL(value);
  if (
    url.origin !== 'https://accounts.google.com' ||
    url.username ||
    url.password ||
    !['/o/oauth2/v2/auth', '/o/oauth2/auth'].includes(url.pathname) ||
    url.searchParams.get('response_type') !== 'code' ||
    url.searchParams.get('redirect_uri') !== new URL('/api/auth/callback/google', apiOrigin).href
  )
    throw new Error('Google returned an unexpected sign-in address. Please try again.');
  return url.href;
}
