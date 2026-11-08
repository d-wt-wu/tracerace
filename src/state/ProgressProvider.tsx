import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CHALLENGES, type Challenge } from '../content/curriculum';
import { makeQuestion } from '../content/bank';
import type { AssessmentDraft, AssessmentResult } from '../domain/assessment';
import { decodeProgress, freshProgress, recordPractice, type Progress } from './progress';
const GUEST_KEY = '@tracerace/progress/v1';
type Context = {
  progress: Progress;
  loaded: boolean;
  storageNotice: string | null;
  canUndo: boolean;
  solve: (question: Challenge, assisted: boolean) => number;
  startAssessment: (draft: AssessmentDraft) => void;
  answerAssessment: (index: number, value: string) => void;
  saveAssessment: (result: AssessmentResult) => void;
  clearAssessment: () => void;
  toggleHaptics: () => void;
  reset: () => Promise<void>;
  undoReset: () => Promise<void>;
  getSnapshot: () => Progress;
  replaceProgress: (next: Progress, backup?: boolean) => Promise<void>;
};
const Store = createContext<Context | null>(null);
const ids = CHALLENGES.map((c) => c.id);
export function ProgressProvider({
  children,
  storageKey = GUEST_KEY,
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const KEY = storageKey,
    BACKUP = KEY === GUEST_KEY ? '@tracerace/progress/previous' : KEY + '/previous';
  const [progress, setProgress] = useState<Progress>(freshProgress);
  const [loaded, setLoaded] = useState(false),
    [storageNotice, setNotice] = useState<string | null>(null),
    [canUndo, setCanUndo] = useState(false);
  const current = useRef(progress),
    blocked = useRef(false),
    writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let alive = true;
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(BACKUP)])
      .then(([raw, previous]) => {
        const saved = decodeProgress(raw, ids);
        if (!alive) return;
        current.current = saved;
        setProgress(saved);
        if (previous) {
          try {
            decodeProgress(previous, ids);
            setCanUndo(true);
          } catch {
            /* Preserve the old backup. */
          }
        }
      })
      .catch(() => {
        blocked.current = true;
        if (alive)
          setNotice(
            'Saved progress could not be read. You can practice; reset from Your progress to create a fresh save.',
          );
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [KEY, BACKUP]);
  const commit = useCallback(
    (next: Progress) => {
      current.current = next;
      setProgress(next);
      if (blocked.current) return;
      writes.current = writes.current
        .catch(() => undefined)
        .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
        .then(() => setNotice(null))
        .catch(() =>
          setNotice('This session works, but progress could not be saved on this device.'),
        );
    },
    [KEY],
  );
  const getSnapshot = useCallback(() => current.current, []);
  const replaceProgress = useCallback(
    async (next: Progress, backup = false) => {
      if (backup) {
        await AsyncStorage.setItem(BACKUP, JSON.stringify(current.current));
        setCanUndo(true);
      }
      commit(next);
    },
    [commit, BACKUP],
  );
  const solve = useCallback(
    (question: Challenge, assisted: boolean) => {
      if (!ids.includes(question.id)) throw new Error('Unknown challenge');
      const result = recordPractice(current.current, question, assisted);
      commit(result.progress);
      return result.earned;
    },
    [commit],
  );
  const startAssessment = useCallback(
    (draft: AssessmentDraft) => {
      commit({ ...current.current, assessmentDraft: draft });
    },
    [commit],
  );
  const answerAssessment = useCallback(
    (index: number, value: string) => {
      const draft = current.current.assessmentDraft;
      if (!draft || !draft.refs[index]) throw new Error('No assessment question');
      const q = makeQuestion(draft.refs[index].id, draft.refs[index].seed);
      if (value !== '__skip__' && !q.choices.some((c) => c.value === value))
        throw new Error('Invalid assessment answer');
      const answers = [...draft.answers];
      answers[index] = value;
      commit({ ...current.current, assessmentDraft: { ...draft, answers } });
    },
    [commit],
  );
  const saveAssessment = useCallback(
    (result: AssessmentResult) => {
      commit({
        ...current.current,
        assessmentDraft:
          current.current.assessmentDraft?.id === result.id
            ? null
            : current.current.assessmentDraft,
        assessments: [result, ...current.current.assessments.filter((r) => r.id !== result.id)]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10),
      });
    },
    [commit],
  );
  const clearAssessment = useCallback(
    () => commit({ ...current.current, assessmentDraft: null }),
    [commit],
  );
  const toggleHaptics = useCallback(
    () => commit({ ...current.current, haptics: !current.current.haptics }),
    [commit],
  );
  const reset = useCallback(async () => {
    try {
      await writes.current;
      const old = await AsyncStorage.getItem(KEY);
      if (old) await AsyncStorage.setItem(BACKUP, old);
      await AsyncStorage.setItem(KEY, JSON.stringify(freshProgress()));
      blocked.current = false;
      setCanUndo(Boolean(old));
      setNotice(null);
      commit(freshProgress());
    } catch {
      setNotice('Progress could not be reset. Your previous save has been kept.');
    }
  }, [commit, KEY, BACKUP]);
  const undoReset = useCallback(async () => {
    try {
      await writes.current;
      const old = await AsyncStorage.getItem(BACKUP);
      if (!old) return;
      const recovered = decodeProgress(old, ids);
      await AsyncStorage.setItem(KEY, JSON.stringify(recovered));
      blocked.current = false;
      commit(recovered);
      setNotice(null);
    } catch {
      setNotice('The previous save could not be restored. Your current progress is unchanged.');
    }
  }, [commit, KEY, BACKUP]);
  return (
    <Store.Provider
      value={{
        progress,
        getSnapshot,
        replaceProgress,
        loaded,
        storageNotice,
        canUndo,
        solve,
        startAssessment,
        answerAssessment,
        saveAssessment,
        clearAssessment,
        toggleHaptics,
        reset,
        undoReset,
      }}
    >
      {children}
    </Store.Provider>
  );
}
export const useProgress = () => {
  const value = useContext(Store);
  if (!value) throw new Error('ProgressProvider is missing');
  return value;
};
