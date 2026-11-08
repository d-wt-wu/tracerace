import { Platform } from 'react-native';
const webURL = process.env.EXPO_PUBLIC_WEB_API_URL;
export const API_URL = (
  (Platform.OS === 'web' &&
    (webURL === 'same-origin' && typeof window !== 'undefined'
      ? window.location.origin
      : webURL)) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8787'
).replace(/\/$/, '');
