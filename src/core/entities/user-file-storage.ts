import { USER_FILE_TYPES, type UserFileType } from "./user-file";
import type { MediaAssetRetentionClass, MediaAssetSource } from "./media-asset";

export interface UserFileStorageBucket {
  files: number;
  bytes: number;
}

export type UserFileStorageByType = Record<UserFileType, UserFileStorageBucket>;
export type UserFileStorageByRetentionClass = Record<MediaAssetRetentionClass, UserFileStorageBucket>;
export type UserFileStorageBySource = Record<MediaAssetSource, UserFileStorageBucket>;

export interface UserFileStorageSummary {
  totalFiles: number;
  totalBytes: number;
  attachedFiles: number;
  attachedBytes: number;
  unattachedFiles: number;
  unattachedBytes: number;
  byType: UserFileStorageByType;
  byRetentionClass: UserFileStorageByRetentionClass;
  bySource: UserFileStorageBySource;
}

export interface FleetUserFileStorageSummary extends UserFileStorageSummary {
  totalUsers: number;
}

export interface UserStorageLeaderboardEntry {
  userId: string;
  totalFiles: number;
  totalBytes: number;
}

export function createEmptyUserFileStorageByType(): UserFileStorageByType {
  return USER_FILE_TYPES.reduce((accumulator, type) => {
    accumulator[type] = { files: 0, bytes: 0 };
    return accumulator;
  }, {} as UserFileStorageByType);
}

export function createEmptyUserFileStorageSummary(): UserFileStorageSummary {
  return {
    totalFiles: 0,
    totalBytes: 0,
    attachedFiles: 0,
    attachedBytes: 0,
    unattachedFiles: 0,
    unattachedBytes: 0,
    byType: createEmptyUserFileStorageByType(),
    byRetentionClass: {
      ephemeral: { files: 0, bytes: 0 },
      conversation: { files: 0, bytes: 0 },
      durable: { files: 0, bytes: 0 },
    },
    bySource: {
      uploaded: { files: 0, bytes: 0 },
      generated: { files: 0, bytes: 0 },
      derived: { files: 0, bytes: 0 },
    },
  };
}

export function createEmptyFleetUserFileStorageSummary(): FleetUserFileStorageSummary {
  return {
    ...createEmptyUserFileStorageSummary(),
    totalUsers: 0,
  };
}