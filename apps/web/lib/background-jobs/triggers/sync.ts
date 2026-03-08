/**
 * Repository sync task identifiers.
 */

export const SyncTaskIds = {
  repoSync: 'repo-sync-once'
} as const;

export type SyncTaskId = typeof SyncTaskIds[keyof typeof SyncTaskIds];


