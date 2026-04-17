import { getUserFileDataMapper } from "@/adapters/RepositoryFactory";
import { getAdminConversationDetailPath } from "@/lib/admin/conversations/admin-conversations-routes";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";
import type { RoleName } from "@/core/entities/user";
import type { MediaAssetRetentionClass, MediaAssetSource } from "@/core/entities/media-asset";
import type { UserFileType } from "@/core/entities/user-file";
import type { AdminUserFileFilters } from "@/core/entities/user-file-query";
import {
  getFleetMediaStorageAccount,
  type FleetMediaStorageAccount,
} from "@/lib/storage/media-storage-accounting";
import { getMediaVolumeCapacity, type MediaVolumeCapacity } from "@/lib/storage/volume-capacity";
import { resolveUserFileRetentionClass, resolveUserFileSource } from "@/lib/media/media-asset-projection";

const OPERATIONS_MEDIA_DEFAULT_PAGE_SIZE = 50;

const OPERATIONS_MEDIA_FILE_TYPES: readonly UserFileType[] = [
  "audio",
  "chart",
  "document",
  "graph",
  "image",
  "video",
  "subtitle",
  "waveform",
] as const;

const OPERATIONS_MEDIA_SOURCES: readonly MediaAssetSource[] = ["uploaded", "generated", "derived"] as const;
const OPERATIONS_MEDIA_RETENTION_CLASSES: readonly MediaAssetRetentionClass[] = ["ephemeral", "conversation", "durable"] as const;

export interface OperationsMediaFilters {
  search: string;
  userId: string;
  fileType: UserFileType | null;
  source: MediaAssetSource | null;
  retentionClass: MediaAssetRetentionClass | null;
  attached: boolean | null;
}

export interface OperationsMediaItem {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  fileType: UserFileType;
  fileSize: number;
  createdAt: string;
  previewUrl: string;
  conversationId: string | null;
  conversationHref: string | null;
  source: MediaAssetSource;
  retentionClass: MediaAssetRetentionClass;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

export interface OperationsMediaWorkspaceData {
  filters: OperationsMediaFilters;
  items: OperationsMediaItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  fleetAccount: FleetMediaStorageAccount;
  hostCapacity: MediaVolumeCapacity;
}

function normalizeEnumValue<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  return allowed.includes(trimmed as T) ? (trimmed as T) : null;
}

function normalizeString(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim() ?? "";
}

function normalizeAttached(value: string | string[] | undefined): boolean | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) {
    return null;
  }

  if (candidate === "attached") {
    return true;
  }

  if (candidate === "unattached") {
    return false;
  }

  return null;
}

function buildAdminFilters(filters: OperationsMediaFilters): AdminUserFileFilters {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.fileType ? { fileType: filters.fileType } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.retentionClass ? { retentionClass: filters.retentionClass } : {}),
    ...(filters.attached !== null ? { attached: filters.attached } : {}),
  };
}

export function parseOperationsMediaFilters(
  rawSearchParams: Record<string, string | string[] | undefined> = {},
): OperationsMediaFilters {
  return {
    search: normalizeString(rawSearchParams.q),
    userId: normalizeString(rawSearchParams.userId),
    fileType: normalizeEnumValue(rawSearchParams.type, OPERATIONS_MEDIA_FILE_TYPES),
    source: normalizeEnumValue(rawSearchParams.source, OPERATIONS_MEDIA_SOURCES),
    retentionClass: normalizeEnumValue(rawSearchParams.retention, OPERATIONS_MEDIA_RETENTION_CLASSES),
    attached: normalizeAttached(rawSearchParams.attached),
  };
}

export async function loadOperationsMediaWorkspace(
  viewerRoles: readonly RoleName[],
  rawSearchParams: Record<string, string | string[] | undefined> = {},
): Promise<OperationsMediaWorkspaceData> {
  const filters = parseOperationsMediaFilters(rawSearchParams);
  const pagination = buildAdminPaginationParams(rawSearchParams, OPERATIONS_MEDIA_DEFAULT_PAGE_SIZE);
  const adminFilters = buildAdminFilters(filters);
  const repo = getUserFileDataMapper();
  const canLinkConversationDetail = viewerRoles.includes("ADMIN");

  const [items, totalCount, fleetAccount, hostCapacity] = await Promise.all([
    repo.listForAdmin({
      ...adminFilters,
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    repo.countForAdmin(adminFilters),
    getFleetMediaStorageAccount(repo, { filters: adminFilters }),
    getMediaVolumeCapacity(),
  ]);

  return {
    filters,
    totalCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
    hasPrevPage: pagination.page > 1,
    hasNextPage: pagination.offset + items.length < totalCount,
    fleetAccount,
    hostCapacity,
    items: items.map((item) => ({
      id: item.id,
      userId: item.userId,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileType: item.fileType,
      fileSize: item.fileSize,
      createdAt: item.createdAt,
      previewUrl: `/api/user-files/${item.id}`,
      conversationId: item.conversationId,
      conversationHref: canLinkConversationDetail && item.conversationId
        ? getAdminConversationDetailPath(item.conversationId)
        : null,
      source: resolveUserFileSource(item),
      retentionClass: resolveUserFileRetentionClass(item),
      width: typeof item.metadata.width === "number" ? item.metadata.width : null,
      height: typeof item.metadata.height === "number" ? item.metadata.height : null,
      durationSeconds: typeof item.metadata.durationSeconds === "number"
        ? item.metadata.durationSeconds
        : null,
    })),
  };
}