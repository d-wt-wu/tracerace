import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useProgress } from './ProgressProvider';
import { decodeProgress } from './progress';
import { FAMILIES } from '../content/bank';
import {
  GUEST_PROGRESS_KEY,
  progressKey,
  cloudSnapshot,
  reconcileProgress,
  type SaveMeta,
} from '../domain/sync';
import { API_URL } from '../config/api';
import { ApiError, request } from '../lib/api';
import type { CloudSave } from '../domain/account';
export { GUEST_PROGRESS_KEY, cloudSnapshot } from '../domain/sync';
export const accountProgressKey = (id: string) => progressKey(API_URL, id);
const ids = FAMILIES.map((f) => f.id);
type Status = 'guest' | 'loading' | 'saved' | 'saving' | 'offline' | 'conflict';
type State = {
  status: Status;
  ready: boolean;
  lastSynced: string | null;
  notice: string | null;
  syncNow: () => Promise<void>;
  useAccountSave: () => Promise<void>;
  keepDeviceSave: () => Promise<void>;
  importGuest: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AccountSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { loaded, progress, getSnapshot, replaceProgress } = useProgress();
  const [status, setStatus] = useState<Status>(user ? 'loading' : 'guest');
  const [ready, setReady] = useState(!user),
    [lastSynced, setLast] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const remote = useRef({ revision: 0, snapshot: '', connected: false, conflict: false });
  const alive = useRef(true),
    inFlight = useRef<Promise<void> | null>(null);
  const key = user ? accountProgressKey(user.id) : GUEST_PROGRESS_KEY;
  const metaKey = key + '/cloud-meta';
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(
    async (forceAccount = false) => {
      if (!user || !loaded) return;
      try {
        const [cloud, rawMeta] = await Promise.all([
          request<CloudSave>('/api/account/progress'),
          AsyncStorage.getItem(metaKey),
        ]);
        if (!alive.current) return;
        const meta = rawMeta ? (JSON.parse(rawMeta) as SaveMeta) : null;
        const snapshot = cloud.progress
          ? cloudSnapshot(decodeProgress(JSON.stringify(cloud.progress), ids))
          : '';
        const { conflict, useRemote } = reconcileProgress(getSnapshot(), meta, cloud, forceAccount);
        remote.current = { revision: cloud.revision, snapshot, connected: true, conflict };
        setLast(cloud.updatedAt);
        if (conflict) {
          setStatus('conflict');
          setNotice('There’s a newer save on your account. Choose which progress to keep.');
        } else {
          if (cloud.progress && useRemote) {
            const next = decodeProgress(JSON.stringify(cloud.progress), ids);
            await replaceProgress(
              {
                ...next,
                haptics: getSnapshot().haptics,
                assessmentDraft: forceAccount ? null : getSnapshot().assessmentDraft,
              },
              forceAccount,
            );
          }
          await AsyncStorage.setItem(
            metaKey,
            JSON.stringify({ revision: cloud.revision, snapshot }),
          );
          if (alive.current) {
            setStatus('saved');
            setNotice(null);
          }
        }
      } catch (error) {
        if (alive.current) {
          remote.current.connected = false;
          setStatus('offline');
          setNotice(
            error instanceof Error ? error.message : 'Your account save could not be loaded.',
          );
        }
      } finally {
        if (alive.current) setReady(true);
      }
    },
    [user, loaded, metaKey, getSnapshot, replaceProgress],
  );
  useEffect(() => {
    if (user && loaded)
      void Promise.resolve().then(() => {
        if (alive.current) return load();
      });
  }, [user?.id, loaded, load, user]);
  const save = useCallback(
    async (replace = false) => {
      while (inFlight.current) await inFlight.current;
      if (
        !user ||
        !alive.current ||
        !remote.current.connected ||
        (remote.current.conflict && !replace)
      )
        return;
      const snapshot = cloudSnapshot(getSnapshot());
      if (snapshot === remote.current.snapshot) return;
      setStatus('saving');
      const pending = (async () => {
        try {
          const result = await request<{ revision: number; updatedAt: string }>(
            '/api/account/progress',
            {
              method: 'PUT',
              body: { progress: JSON.parse(snapshot), revision: remote.current.revision },
            },
          );
          if (!alive.current) return;
          remote.current = {
            revision: result.revision,
            snapshot,
            connected: true,
            conflict: false,
          };
          await AsyncStorage.setItem(
            metaKey,
            JSON.stringify({ revision: result.revision, snapshot }),
          );
          if (alive.current) {
            setLast(result.updatedAt);
            setNotice(null);
            setStatus('saved');
          }
        } catch (error) {
          if (alive.current) {
            const conflict = error instanceof ApiError && error.status === 409;
            remote.current.conflict = conflict;
            setStatus(conflict ? 'conflict' : 'offline');
            setNotice(
              error instanceof Error ? error.message : 'The account save could not be updated.',
            );
          }
        }
      })();
      inFlight.current = pending;
      try {
        await pending;
      } finally {
        if (inFlight.current === pending) inFlight.current = null;
      }
    },
    [user, metaKey, getSnapshot],
  );
  useEffect(() => {
    if (
      !user ||
      !loaded ||
      !ready ||
      status !== 'saved' ||
      !remote.current.connected ||
      remote.current.conflict ||
      cloudSnapshot(progress) === remote.current.snapshot
    )
      return;
    const timer = setTimeout(() => {
      void save();
    }, 900);
    return () => clearTimeout(timer);
  }, [user, loaded, ready, status, progress, save]);
  const syncNow = useCallback(async () => {
    if (!remote.current.connected) await load();
    await save();
  }, [load, save]);
  const keepDeviceSave = useCallback(async () => {
    if (!user || inFlight.current) return;
    try {
      const currentCloud = await request<CloudSave>('/api/account/progress');
      if (!alive.current) return;
      await AsyncStorage.setItem(key + '/account-before-replace', JSON.stringify(currentCloud));
      remote.current.revision = currentCloud.revision;
      remote.current.connected = true;
      await save(true);
    } catch (error) {
      if (alive.current)
        setNotice(error instanceof Error ? error.message : 'Try again when you’re connected.');
    }
  }, [user, key, save]);
  const importGuest = useCallback(async () => {
    if (!user) throw new Error('Sign in first.');
    if (
      Object.keys(getSnapshot().skills).length ||
      getSnapshot().assessments.length ||
      Object.keys(getSnapshot().cscb07.concepts).length ||
      Object.keys(getSnapshot().cscb07.written).length ||
      Object.keys(getSnapshot().cscb07.papers).length
    )
      throw new Error(
        'This account already has practice history. Your guest save is still safe on this device.',
      );
    const guest = decodeProgress(await AsyncStorage.getItem(GUEST_PROGRESS_KEY), ids);
    await replaceProgress({ ...guest, assessmentDraft: null });
  }, [user, getSnapshot, replaceProgress]);
  return (
    <Context.Provider
      value={{
        status,
        ready,
        lastSynced,
        notice,
        syncNow,
        useAccountSave: () => load(true),
        keepDeviceSave,
        importGuest,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAccountSync() {
  const value = useContext(Context);
  if (!value) throw new Error('AccountSyncProvider is missing');
  return value;
}
