import type { Progress } from '../state/progress';
import { hash } from '../content/bank';
export const GUEST_PROGRESS_KEY = '@tracerace/progress/v1';
export const progressKey = (api: string, userId: string) =>
  GUEST_PROGRESS_KEY + '/account/' + hash(api) + '/' + encodeURIComponent(userId);
export const cloudSnapshot = (progress: Progress) =>
  JSON.stringify({ ...progress, haptics: true, assessmentDraft: null });
export type SaveMeta = { revision: number; snapshot: string };
export function reconcileProgress(
  local: Progress,
  meta: SaveMeta | null,
  remote: { revision: number; progress: Progress | null },
  forceAccount = false,
) {
  const dirty = meta
    ? cloudSnapshot(local) !== meta.snapshot
    : !!Object.keys(local.skills).length ||
      !!local.assessments.length ||
      !!local.cscb07?.startedDay;
  const conflict =
    !forceAccount && !!remote.progress && dirty && remote.revision !== (meta?.revision ?? 0);
  return { conflict, useRemote: !!remote.progress && !conflict && (forceAccount || !dirty) };
}
