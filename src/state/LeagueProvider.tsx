import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { API_URL } from '../config/api';
import { request } from '../lib/api';
import { useAuth } from './AuthProvider';
import { BANK_VERSION, hash, materialize, type QuestionRef } from '../content/bank';
import type { Challenge } from '../content/curriculum';
import type { AssessmentDraft, AssessmentResult } from '../domain/assessment';
import type { Boards, GradeReceipt, PlayerIdentity } from '../domain/league';

const KEY = 'tracerace.league.' + hash(API_URL);
async function getStored() {
  return Platform.OS === 'web' ? AsyncStorage.getItem(KEY) : SecureStore.getItemAsync(KEY);
}
async function store(value: PlayerIdentity) {
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, raw);
  else
    await SecureStore.setItemAsync(KEY, raw, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
type Context = {
  identity: PlayerIdentity | null;
  guestIdentity: PlayerIdentity | null;
  forgetGuest: () => Promise<void>;
  ready: boolean;
  boards: Boards | null;
  error: string | null;
  busy: boolean;
  join: (alias: string) => Promise<boolean>;
  setVisible: (active: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  practice: (ids: string[]) => Promise<Challenge[] | null>;
  grade: (question: Challenge, choice: string, assisted: boolean) => Promise<GradeReceipt | null>;
  assessment: () => Promise<AssessmentDraft | null>;
  finish: (draft: AssessmentDraft) => Promise<AssessmentResult>;
};
const State = createContext<Context | null>(null);
export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const {
    user: accountUser,
    profile: accountProfile,
    refreshProfile: refreshAccountProfile,
  } = useAuth();
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null),
    [ready, setReady] = useState(false);
  const [boards, setBoards] = useState<Boards | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const current = useRef<PlayerIdentity | null>(null);
  const signedIn = useRef(!!accountUser);
  const selected = useMemo<PlayerIdentity | null>(
    () =>
      accountUser
        ? accountProfile
          ? { ...accountProfile, token: '', account: true }
          : null
        : identity,
    [accountUser, accountProfile, identity],
  );
  useEffect(() => {
    signedIn.current = !!accountUser;
    current.current = selected;
  }, [accountUser, selected]);
  const forgetGuest = useCallback(async () => {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
    setIdentity(null);
  }, []);
  const accept = useCallback(
    async (next: PlayerIdentity) => {
      if (next.account) {
        await refreshAccountProfile();
        current.current = next;
      } else {
        await store(next);
        current.current = next;
        setIdentity(next);
      }
    },
    [refreshAccountProfile],
  );
  const refresh = useCallback(async () => {
    if (!current.current?.active) return;
    try {
      setBoards(await request<Boards>('/api/boards', { identity: current.current }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rankings could not be loaded.');
    }
  }, []);
  useEffect(() => {
    let alive = true;
    getStored()
      .then((raw) => {
        if (!raw || !alive) return;
        const value = JSON.parse(raw) as PlayerIdentity;
        if (
          typeof value.id !== 'string' ||
          typeof value.alias !== 'string' ||
          !/^tr_[a-f0-9]{64}$/.test(value.token) ||
          typeof value.active !== 'boolean'
        )
          throw new Error('Invalid player ticket');
        if (!signedIn.current) current.current = value;
        setIdentity(value);
        if (value.active && !signedIn.current) void refresh();
      })
      .catch(() => {
        if (alive)
          setError(
            'The device’s league ticket could not be read. On-device practice is available.',
          );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (accountUser && accountProfile?.active) void refresh();
  }, [accountUser?.id, accountProfile?.id, accountProfile?.active, refresh, accountUser]);
  const join = useCallback(
    async (alias: string) => {
      setBusy(true);
      setError(null);
      try {
        if (accountUser && !accountProfile)
          throw new Error('Finish setting up your account profile first.');
        let next: PlayerIdentity;
        if (current.current) {
          const changed = await request<Omit<PlayerIdentity, 'token'>>('/api/me', {
            method: 'PATCH',
            body: { alias, active: true },
            identity: current.current,
          });
          next = { ...current.current, ...changed };
        } else
          next = await request<PlayerIdentity>('/api/players', { method: 'POST', body: { alias } });
        try {
          await accept(next);
        } catch {
          await request('/api/me', {
            method: 'PATCH',
            body: { active: false },
            identity: next,
          }).catch(() => undefined);
          throw new Error(
            'The device could not keep its player ticket. Your ranking has been hidden.',
          );
        }
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join the league.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [accept, refresh, accountUser, accountProfile],
  );
  const setVisible = useCallback(
    async (active: boolean) => {
      if (!current.current) return;
      setBusy(true);
      try {
        const changed = await request<Omit<PlayerIdentity, 'token'>>('/api/me', {
          method: 'PATCH',
          body: { active },
          identity: current.current,
        });
        await accept({ ...current.current, ...changed });
        if (active) await refresh();
        else setBoards(null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Visibility could not be changed.');
      } finally {
        setBusy(false);
      }
    },
    [accept, refresh],
  );
  const practice = useCallback(async (ids: string[]) => {
    if (!current.current || (!current.current.active && !current.current.account)) return null;
    try {
      const result = await request<{ refs: QuestionRef[]; bankVersion: number }>('/api/practice', {
        method: 'POST',
        body: { ids, bankVersion: BANK_VERSION },
        identity: current.current,
      });
      if (result.bankVersion !== BANK_VERSION || result.refs.length !== ids.length)
        throw new Error('Refresh the app to match this question bank.');
      setError(null);
      return result.refs.map(materialize);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This lesson will stay on your device.');
      return null;
    }
  }, []);
  const grade = useCallback(
    async (question: Challenge, choice: string, assisted: boolean) => {
      if (!question.rankTicket || !current.current) return null;
      try {
        const result = await request<GradeReceipt>('/api/answers', {
          method: 'POST',
          body: { ticket: question.rankTicket, choice, assisted },
          identity: current.current,
        });
        setError(null);
        if (result.correct) void refresh();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That solve stayed on your device.');
        return null;
      }
    },
    [refresh],
  );
  const assessment = useCallback(async () => {
    if (!current.current || (!current.current.active && !current.current.account)) return null;
    return request<AssessmentDraft>('/api/assessments', {
      method: 'POST',
      body: { bankVersion: BANK_VERSION },
      identity: current.current,
    });
  }, []);
  const finish = useCallback(
    async (draft: AssessmentDraft) => {
      if (!draft.remoteId || !current.current)
        throw new Error('This assessment is on-device only.');
      const result = await request<AssessmentResult>(
        '/api/assessments/' + draft.remoteId + '/finish',
        { method: 'POST', body: { answers: draft.answers }, identity: current.current },
      );
      void refresh();
      return result;
    },
    [refresh],
  );
  return (
    <State.Provider
      value={{
        identity: selected,
        guestIdentity: identity,
        forgetGuest,
        ready,
        boards,
        error,
        busy,
        join,
        setVisible,
        refresh,
        practice,
        grade,
        assessment,
        finish,
      }}
    >
      {children}
    </State.Provider>
  );
}
export const useLeague = () => {
  const value = useContext(State);
  if (!value) throw new Error('LeagueProvider is missing');
  return value;
};
