export const nativeOrigin = 'tracerace://';
export function webOrigins() {
  return [
    ...new Set([
      ...(process.env.TRACERACE_MODE === 'beta'
        ? []
        : ['http://localhost:8081', 'http://localhost:8082', 'http://127.0.0.1:8082']),
      ...[process.env.TRACERACE_WEB_ORIGIN].filter((x): x is string => !!x),
    ]),
  ];
}
export const allowedOrigin = (origin: string) => webOrigins().includes(origin);
export function allowAccountWrite(headers: Headers) {
  const origin = headers.get('origin');
  return origin ? allowedOrigin(origin) : headers.get('expo-origin') === nativeOrigin;
}
