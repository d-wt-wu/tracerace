import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { request } from '../lib/api';
import type { AccountUser, AccountProfile, AuthCapabilities } from '../domain/account';
type State = {
  user: AccountUser | null;
  ready: boolean;
  profile: AccountProfile | null;
  profileLoading: boolean;
  capabilities: AuthCapabilities | null;
  notice: string | null;
  refreshProfile: () => Promise<void>;
  refreshCapabilities: () => Promise<void>;
  refreshSession: () => Promise<void>;
  createProfile: (alias: string, active: boolean, guestToken?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();
  const user = data?.user ?? null;
  const [record, setRecord] = useState<{ userId: string; profile: AccountProfile | null } | null>(
    null,
  );
  const [profileLoading, setLoading] = useState(false),
    [notice, setNotice] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null);
  const userId = user?.id;
  const currentId = useRef(userId);
  const refreshCapabilities = useCallback(async () => {
    try {
      setCapabilities(await request<AuthCapabilities>('/api/auth-config'));
      setNotice(null);
    } catch {
      setNotice('Account service is unavailable. Guest practice still works.');
    }
  }, []);
  useEffect(() => {
    let alive = true;
    request<AuthCapabilities>('/api/auth-config')
      .then((value) => {
        if (alive) setCapabilities(value);
      })
      .catch(() => {
        if (alive) setNotice('Account service is unavailable. Guest practice still works.');
      });
    return () => {
      alive = false;
    };
  }, []);
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await request<{ profile: AccountProfile | null }>('/api/account/profile');
      if (currentId.current !== userId) return;
      setRecord({ userId, profile: result.profile });
      setNotice(null);
    } catch (error) {
      if (currentId.current === userId)
        setNotice(error instanceof Error ? error.message : 'Your profile could not be loaded.');
    } finally {
      if (currentId.current === userId) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    currentId.current = userId;
    if (!userId) return;
    let alive = true;
    request<{ profile: AccountProfile | null }>('/api/account/profile')
      .then((result) => {
        if (alive) {
          setRecord({ userId, profile: result.profile });
          setNotice(null);
        }
      })
      .catch((error) => {
        if (alive) {
          setRecord({ userId, profile: null });
          setNotice(error instanceof Error ? error.message : 'Your profile could not be loaded.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  const createProfile = useCallback(
    async (alias: string, active: boolean, guestToken?: string) => {
      const result = await request<{ profile: AccountProfile; claimedGuest: boolean }>(
        '/api/account/profile',
        { method: 'POST', body: { alias, active, ...(guestToken ? { guestToken } : {}) } },
      );
      if (userId && currentId.current === userId) setRecord({ userId, profile: result.profile });
      return result.claimedGuest;
    },
    [userId],
  );
  const signOut = useCallback(async () => {
    const result = await authClient.signOut();
    if (result.error)
      throw new Error(result.error.message || 'Could not sign out. Please try again.');
    await refetch();
  }, [refetch]);
  return (
    <Context.Provider
      value={{
        user,
        ready: !isPending,
        profile: record && record.userId === userId ? record.profile : null,
        profileLoading: !!userId && (profileLoading || record?.userId !== userId),
        capabilities,
        notice,
        refreshProfile,
        refreshCapabilities,
        refreshSession: async () => {
          await refetch();
        },
        createProfile,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
