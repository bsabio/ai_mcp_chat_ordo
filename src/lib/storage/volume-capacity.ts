import { statfs } from "node:fs/promises";

import { getDataRootPath } from "@/lib/user-files";

export interface MediaVolumeCapacityAvailable {
  status: "available";
  checkedAt: string;
  rootPath: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  percentUsed: number;
}

export interface MediaVolumeCapacityUnavailable {
  status: "unavailable";
  checkedAt: string;
  rootPath: string;
  reason: string;
}

export type MediaVolumeCapacity = MediaVolumeCapacityAvailable | MediaVolumeCapacityUnavailable;

interface StatFsResult {
  bsize: number;
  blocks: number;
  bavail: number;
}

interface GetMediaVolumeCapacityOptions {
  rootPath?: string;
}

interface GetMediaVolumeCapacityDeps {
  statfsImpl?: (path: string) => Promise<StatFsResult>;
  now?: () => Date;
}

export async function getMediaVolumeCapacity(
  options: GetMediaVolumeCapacityOptions = {},
  deps: GetMediaVolumeCapacityDeps = {},
): Promise<MediaVolumeCapacity> {
  const rootPath = options.rootPath ?? getDataRootPath();
  const checkedAt = (deps.now ?? (() => new Date()))().toISOString();
  const runStatfs = deps.statfsImpl ?? statfs;

  try {
    const result = await runStatfs(rootPath);
    const blockSize = Number(result.bsize ?? 0);
    const totalBlocks = Number(result.blocks ?? 0);
    const availableBlocks = Number(result.bavail ?? 0);

    if (!Number.isFinite(blockSize) || !Number.isFinite(totalBlocks) || !Number.isFinite(availableBlocks)
      || blockSize <= 0 || totalBlocks < 0 || availableBlocks < 0) {
      return {
        status: "unavailable",
        checkedAt,
        rootPath,
        reason: "Filesystem capacity metrics were incomplete for the writable media volume.",
      };
    }

    const totalBytes = totalBlocks * blockSize;
    const freeBytes = Math.min(availableBlocks * blockSize, totalBytes);
    const usedBytes = Math.max(totalBytes - freeBytes, 0);
    const percentUsed = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

    return {
      status: "available",
      checkedAt,
      rootPath,
      totalBytes,
      freeBytes,
      usedBytes,
      percentUsed,
    };
  } catch (error) {
    return {
      status: "unavailable",
      checkedAt,
      rootPath,
      reason: error instanceof Error
        ? error.message
        : "Filesystem capacity data is unavailable for the writable media volume.",
    };
  }
}