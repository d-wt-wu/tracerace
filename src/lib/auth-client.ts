import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';
import { hash } from '../content/bank';
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include', timeout: 15000 },
  plugins: [
    expoClient({
      scheme: 'tracerace',
      storage: SecureStore,
      storagePrefix: 'tracerace_auth_' + hash(API_URL),
      cookiePrefix: 'tracerace',
    }),
  ],
});
