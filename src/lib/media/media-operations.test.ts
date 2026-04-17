import { beforeEach, describe, expect, it, vi } from "vitest";

const { listForAdminMock, countForAdminMock, getFleetMediaStorageAccountMock, getMediaVolumeCapacityMock } = vi.hoisted(() => ({
  listForAdminMock: vi.fn(),
  countForAdminMock: vi.fn(),
  getFleetMediaStorageAccountMock: vi.fn(),
  getMediaVolumeCapacityMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserFileDataMapper: () => ({
    listForAdmin: listForAdminMock,
    countForAdmin: countForAdminMock,
  }),
}));

vi.mock("@/lib/storage/media-storage-accounting", () => ({
  getFleetMediaStorageAccount: getFleetMediaStorageAccountMock,
}));

vi.mock("@/lib/storage/volume-capacity", () => ({
  getMediaVolumeCapacity: getMediaVolumeCapacityMock,
}));

import {
  loadOperationsMediaWorkspace,
  parseOperationsMediaFilters,
} from "@/lib/media/media-operations";

describe("media operations loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countForAdminMock.mockResolvedValue(1);
    listForAdminMock.mockResolvedValue([
      {
        id: "uf_1",
        userId: "usr_1",
        conversationId: "conv_1",
        contentHash: "hash",
        fileType: "image",
        fileName: "hero.png",
        mimeType: "image/png",
        fileSize: 4096,
        metadata: { width: 1200, height: 800, source: "uploaded", retentionClass: "durable" },
        createdAt: "2026-04-15T12:00:00.000Z",
      },
    ]);
    getFleetMediaStorageAccountMock.mockResolvedValue({
      summary: {
        totalFiles: 1,
        totalBytes: 4096,
        totalUsers: 1,
        attachedFiles: 1,
        attachedBytes: 4096,
        unattachedFiles: 0,
        unattachedBytes: 0,
        byType: {
          audio: { files: 0, bytes: 0 },
          chart: { files: 0, bytes: 0 },
          document: { files: 0, bytes: 0 },
          graph: { files: 0, bytes: 0 },
          image: { files: 1, bytes: 4096 },
          video: { files: 0, bytes: 0 },
          subtitle: { files: 0, bytes: 0 },
          waveform: { files: 0, bytes: 0 },
        },
        byRetentionClass: {
          ephemeral: { files: 0, bytes: 0 },
          conversation: { files: 0, bytes: 0 },
          durable: { files: 1, bytes: 4096 },
        },
        bySource: {
          uploaded: { files: 1, bytes: 4096 },
          generated: { files: 0, bytes: 0 },
          derived: { files: 0, bytes: 0 },
        },
      },
      topUsers: [{ userId: "usr_1", totalFiles: 1, totalBytes: 4096 }],
      topFileTypes: [{ fileType: "image", files: 1, bytes: 4096 }],
    });
    getMediaVolumeCapacityMock.mockResolvedValue({
      status: "available",
      checkedAt: "2026-04-15T12:00:00.000Z",
      rootPath: "/app/.data",
      totalBytes: 100000,
      freeBytes: 50000,
      usedBytes: 50000,
      percentUsed: 50,
    });
  });

  it("parses the supported filters and normalizes invalid values", () => {
    expect(parseOperationsMediaFilters({
      q: " hero ",
      userId: " usr_1 ",
      type: "image",
      source: "uploaded",
      retention: "durable",
      attached: "attached",
    })).toEqual({
      search: "hero",
      userId: "usr_1",
      fileType: "image",
      source: "uploaded",
      retentionClass: "durable",
      attached: true,
    });

    expect(parseOperationsMediaFilters({ type: "bad", attached: "maybe" })).toEqual({
      search: "",
      userId: "",
      fileType: null,
      source: null,
      retentionClass: null,
      attached: null,
    });
  });

  it("loads admin-linkable conversation detail for admin viewers", async () => {
    const workspace = await loadOperationsMediaWorkspace(["ADMIN"], { q: "hero", userId: "usr_1", page: "2" });

    expect(countForAdminMock).toHaveBeenCalledWith({ search: "hero", userId: "usr_1" });
    expect(listForAdminMock).toHaveBeenCalledWith(expect.objectContaining({
      search: "hero",
      userId: "usr_1",
      limit: 50,
      offset: 50,
    }));
    expect(workspace.items[0].conversationHref).toBe("/admin/conversations/conv_1");
    expect(workspace.page).toBe(2);
    expect(workspace.hostCapacity).toMatchObject({ status: "available", freeBytes: 50000 });
  });

  it("applies combined filters and reports stable pagination state", async () => {
    countForAdminMock.mockResolvedValue(52);
    listForAdminMock.mockResolvedValue([
      {
        id: "uf_2",
        userId: "usr_1",
        conversationId: "conv_2",
        contentHash: "hash_2",
        fileType: "image",
        fileName: "batch-match-002.png",
        mimeType: "image/png",
        fileSize: 4096,
        metadata: { width: 1200, height: 800, source: "uploaded", retentionClass: "durable" },
        createdAt: "2026-04-15T12:00:01.000Z",
      },
      {
        id: "uf_1",
        userId: "usr_1",
        conversationId: "conv_1",
        contentHash: "hash_1",
        fileType: "image",
        fileName: "batch-match-001.png",
        mimeType: "image/png",
        fileSize: 4096,
        metadata: { width: 1200, height: 800, source: "uploaded", retentionClass: "durable" },
        createdAt: "2026-04-15T12:00:00.000Z",
      },
    ]);

    const workspace = await loadOperationsMediaWorkspace(["STAFF"], {
      q: "batch-match",
      userId: "usr_1",
      type: "image",
      source: "uploaded",
      retention: "durable",
      attached: "attached",
      page: "2",
    });

    expect(countForAdminMock).toHaveBeenCalledWith({
      search: "batch-match",
      userId: "usr_1",
      fileType: "image",
      source: "uploaded",
      retentionClass: "durable",
      attached: true,
    });
    expect(listForAdminMock).toHaveBeenCalledWith({
      search: "batch-match",
      userId: "usr_1",
      fileType: "image",
      source: "uploaded",
      retentionClass: "durable",
      attached: true,
      limit: 50,
      offset: 50,
    });
    expect(workspace.filters).toEqual({
      search: "batch-match",
      userId: "usr_1",
      fileType: "image",
      source: "uploaded",
      retentionClass: "durable",
      attached: true,
    });
    expect(workspace.page).toBe(2);
    expect(workspace.pageSize).toBe(50);
    expect(workspace.hasPrevPage).toBe(true);
    expect(workspace.hasNextPage).toBe(false);
    expect(workspace.items).toHaveLength(2);
    expect(workspace.items[0].conversationHref).toBeNull();
  });

  it("keeps conversation detail unlinked for staff viewers", async () => {
    const workspace = await loadOperationsMediaWorkspace(["STAFF"], {});

    expect(workspace.items[0].conversationHref).toBeNull();
    expect(getFleetMediaStorageAccountMock).toHaveBeenCalled();
    expect(getMediaVolumeCapacityMock).toHaveBeenCalled();
  });
});