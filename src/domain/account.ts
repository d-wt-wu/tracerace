import type { Progress } from '../state/progress';
export type AccountUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};
export type AccountProfile = { id: string; alias: string; active: boolean };
export type AuthCapabilities = {
  email: boolean;
  google: boolean;
  apple: boolean;
  recovery: boolean;
  verification: boolean;
};
export type CloudSave = { progress: Progress | null; revision: number; updatedAt: string | null };
