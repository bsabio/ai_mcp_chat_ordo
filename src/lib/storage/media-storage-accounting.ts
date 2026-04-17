import fs from "fs";
import path from "path";
import type { UserFile, UserFileType } from "@/core/entities/user-file";
import type { AdminUserFileFilters } from "@/core/entities/user-file-query";
import type {
  FleetUserFileStorageSummary,
  UserFileStorageSummary,
  UserStorageLeaderboardEntry,
} from "@/core/entities/user-file-storage";
import type { UserFileRepository } from "@/core/use-cases/UserFileRepository";
import {
  resolveUserFileRetentionClass,
  resolveUserFileSource,
} from "@/lib/media/media-asset-projection";
import { getUserFilesRootPath } from "@/lib/user-files";

export interface StorageTopFileTypeEntry {
  fileType: UserFileType;
  files: number;
  bytes: number;
}

export interface FleetMediaStorageAccount {
  summary: FleetUserFileStorageSummary;
  topUsers: UserStorageLeaderboardEntry[];
  topFileTypes: StorageTopFileTypeEntry[];
}

export interface MediaStorageDiskSummary {
  totalFiles: number;
  totalBytes: number;
}

export interface MediaStorageReconciliationDelta {
  files: number;
  bytes: number;
}

export interface MediaStorageOrphanCandidateTotals {
  unattachedFiles: number;
  unattachedBytes: number;
  missingOnDiskFiles: number;
  missingOnDiskBytes: number;
  diskOnlyFiles: number;
  diskOnlyBytes: number;
}

export interface MediaStorageReconciliationReport extends FleetMediaStorageAccount {
  db: FleetUserFileStorageSummary;
  disk: MediaStorageDiskSummary;
  delta: MediaStorageReconciliationDelta;
  orphanCandidateTotals: MediaStorageOrphanCandidateTotals;
}

const RECONCILIATION_PAGE_SIZE = 100;

interface DiskInventoryEntry {
  relativePath: string;
  bytes: number;
}

function sortTopUsers(entries: UserStorageLeaderboardEntry[]): UserStorageLeaderboardEntry[] {
  return [...entries].sort((left, right) => {
    if (right.totalBytes !== left.totalBytes) {
      return right.totalBytes - left.totalBytes;
    }

    if (right.totalFiles !== left.totalFiles) {
      return right.totalFiles - left.totalFiles;
    }

    return left.userId.localeCompare(right.userId);
  });
}

export function listTopFileTypes(
  summary: Pick<UserFileStorageSummary, "byType">,
  limit = Number.MAX_SAFE_INTEGER,
): StorageTopFileTypeEntry[] {
  return Object.entries(summary.byType)
    .map(([fileType, bucket]) => ({
      fileType: fileType as UserFileType,
      files: bucket.files,
      bytes: bucket.bytes,
    }))
    .filter((entry) => entry.files > 0 || entry.bytes > 0)
    .sort((left, right) => {
      if (right.bytes !== left.bytes) {
        return right.bytes - left.bytes;
      }

      if (right.files !== left.files) {
        return right.files - left.files;
      }

      return left.fileType.localeCompare(right.fileType);
    })
    .slice(0, limit);
}

function collectDiskInventory(rootPath: string): Map<string, DiskInventoryEntry> {
  const inventory = new Map<string, DiskInventoryEntry>();
  if (!fs.existsSync(rootPath)) {
    return inventory;
  }

  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const stats = fs.statSync(entryPath);
      const relativePath = path.relative(rootPath, entryPath).split(path.sep).join("/");
      inventory.set(relativePath, {
        relativePath,
        bytes: stats.size,
      });
    }
  }

  return inventory;
}

async function listAdminInventory(
  repo: UserFileRepository,
  filters: AdminUserFileFilters = {},
): Promise<UserFile[]> {
  const total = await repo.countForAdmin(filters);
  const items: UserFile[] = [];

  for (let offset = 0; offset < total; offset += RECONCILIATION_PAGE_SIZE) {
    const page = await repo.listForAdmin({
      ...filters,
      limit: RECONCILIATION_PAGE_SIZE,
      offset,
    });
    items.push(...page);
  }

  return items;
}

export async function getUserMediaStorageAccount(
  repo: UserFileRepository,
  userId: string,
): Promise<UserFileStorageSummary> {
  return repo.getUserStorageSummary(userId);
}

export async function getFleetMediaStorageAccount(
  repo: UserFileRepository,
  options: {
    filters?: AdminUserFileFilters;
    topUsersLimit?: number;
    topFileTypesLimit?: number;
  } = {},
): Promise<FleetMediaStorageAccount> {
  const filters = options.filters ?? {};
  const topUsersLimit = options.topUsersLimit ?? 10;
  const topFileTypesLimit = options.topFileTypesLimit ?? 5;

  const [summary, topUsers] = await Promise.all([
    repo.getFleetStorageSummary(filters),
    repo.listLargestUsersByStorage(topUsersLimit),
  ]);

  return {
    summary,
    topUsers: sortTopUsers(topUsers).slice(0, topUsersLimit),
    topFileTypes: listTopFileTypes(summary, topFileTypesLimit),
  };
}

export async function reconcileMediaStorage(
  repo: UserFileRepository,
  options: {
    filters?: AdminUserFileFilters;
    rootPath?: string;
    topUsersLimit?: number;
    topFileTypesLimit?: number;
  } = {},
): Promise<MediaStorageReconciliationReport> {
  const filters = options.filters ?? {};
  const rootPath = options.rootPath ?? getUserFilesRootPath();
  const fleetAccount = await getFleetMediaStorageAccount(repo, {
    filters,
    topUsersLimit: options.topUsersLimit,
    topFileTypesLimit: options.topFileTypesLimit,
  });
  const records = await listAdminInventory(repo, filters);
  const diskInventory = collectDiskInventory(rootPath);
  const dbPaths = new Set<string>();
  let missingOnDiskFiles = 0;
  let missingOnDiskBytes = 0;

  for (const record of records) {
    const relativePath = `${record.userId}/${record.fileName}`;
    dbPaths.add(relativePath);

    if (!diskInventory.has(relativePath)) {
      missingOnDiskFiles += 1;
      missingOnDiskBytes += record.fileSize;
    }
  }

  let diskOnlyFiles = 0;
  let diskOnlyBytes = 0;
  let diskTotalFiles = 0;
  let diskTotalBytes = 0;

  for (const entry of diskInventory.values()) {
    diskTotalFiles += 1;
    diskTotalBytes += entry.bytes;

    if (!dbPaths.has(entry.relativePath)) {
      diskOnlyFiles += 1;
      diskOnlyBytes += entry.bytes;
    }
  }

  return {
    ...fleetAccount,
    db: fleetAccount.summary,
    disk: {
      totalFiles: diskTotalFiles,
      totalBytes: diskTotalBytes,
    },
    delta: {
      files: diskTotalFiles - fleetAccount.summary.totalFiles,
      bytes: diskTotalBytes - fleetAccount.summary.totalBytes,
    },
    orphanCandidateTotals: {
      unattachedFiles: fleetAccount.summary.unattachedFiles,
      unattachedBytes: fleetAccount.summary.unattachedBytes,
      missingOnDiskFiles,
      missingOnDiskBytes,
      diskOnlyFiles,
      diskOnlyBytes,
    },
  };
}

export function summarizeUserFilesForAccounting(files: UserFile[]): UserFileStorageSummary {
  const summary: UserFileStorageSummary = {
    totalFiles: 0,
    totalBytes: 0,
    attachedFiles: 0,
    attachedBytes: 0,
    unattachedFiles: 0,
    unattachedBytes: 0,
    byType: {
      audio: { files: 0, bytes: 0 },
      chart: { files: 0, bytes: 0 },
      document: { files: 0, bytes: 0 },
      graph: { files: 0, bytes: 0 },
      image: { files: 0, bytes: 0 },
      video: { files: 0, bytes: 0 },
      subtitle: { files: 0, bytes: 0 },
      waveform: { files: 0, bytes: 0 },
    },
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

  for (const file of files) {
    summary.totalFiles += 1;
    summary.totalBytes += file.fileSize;
    summary.byType[file.fileType].files += 1;
    summary.byType[file.fileType].bytes += file.fileSize;

    const retentionClass = resolveUserFileRetentionClass(file);
    summary.byRetentionClass[retentionClass].files += 1;
    summary.byRetentionClass[retentionClass].bytes += file.fileSize;

    const source = resolveUserFileSource(file);
    summary.bySource[source].files += 1;
    summary.bySource[source].bytes += file.fileSize;

    if (file.conversationId) {
      summary.attachedFiles += 1;
      summary.attachedBytes += file.fileSize;
    } else {
      summary.unattachedFiles += 1;
      summary.unattachedBytes += file.fileSize;
    }
  }

  return summary;
}