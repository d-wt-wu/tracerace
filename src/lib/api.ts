import { Platform } from 'react-native';
import { authClient } from './auth-client';
import { API_URL } from '../config/api';
import type { PlayerIdentity } from '../domain/league';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; identity?: PlayerIdentity | null } = {},
): Promise<T> {
  const abort = new AbortController(),
    timer = setTimeout(() => abort.abort(), 20000);
  try {
    const cookie = Platform.OS === 'web' ? '' : await authClient.getCookie();
    const response = await fetch(API_URL + path, {
      method: options.method ?? 'GET',
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.identity?.token ? { Authorization: 'Bearer ' + options.identity.token } : {}),
        ...(cookie ? { Cookie: cookie, 'expo-origin': 'tracerace://' } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: abort.signal,
    });
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        typeof result.error === 'string'
          ? result.error
          : 'That request could not be completed. Please try again.',
        response.status,
      );
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Couldn’t connect right now. Your practice is saved on this device.');
  } finally {
    clearTimeout(timer);
  }
}
