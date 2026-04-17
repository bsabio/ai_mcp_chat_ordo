import { beforeEach, describe, expect, it, vi } from "vitest";

const { listForUserMock, getUserMediaStorageAccountMock } = vi.hoisted(() => ({
  listForUserMock: vi.fn(),
  getUserMediaStorageAccountMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserFileDataMapper: () => ({
    listForUser: listForUserMock,
  }),
}));

vi.mock("@/lib/storage/media-storage-accounting", () => ({
  getUserMediaStorageAccount: getUserMediaStorageAccountMock,
}));

import { loadUserMediaWorkspace, parseUserMediaFilters } from "@/lib/media/user-media";

describe("user media loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listForUserMock.mockResolvedValue({
      items: [
        {
          id: "uf_1",
          userId: "usr_1",
          conversationId: null,
          contentHash: "hash",
          fileType: "image",
          fileName: "hero.png",
          mimeType: "image/png",
          fileSize: 4096,
          metadata: { width: 1200, height: 800, source: "uploaded", retentionClass: "ephemeral" },
          createdAt: "2026-04-15T12:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    getUserMediaStorageAccountMock.mockResolvedValue({
      totalFiles: 1,
      totalBytes: 4096,
      attachedFiles: 0,
      attachedBytes: 0,
      unattachedFiles: 1,
      unattachedBytes: 4096,
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
        ephemeral: { files: 1, bytes: 4096 },
        conversation: { files: 0, bytes: 0 },
        durable: { files: 0, bytes: 0 },
      },
      bySource: {
        uploaded: { files: 1, bytes: 4096 },
        generated: { files: 0, bytes: 0 },
        derived: { files: 0, bytes: 0 },
      },
    });
  });

  it("parses supported user filters and normalizes invalid values", () => {
    expect(parseUserMediaFilters({
      q: " hero ",
      type: "image",
      source: "uploaded",
      retention: "ephemeral",
      attached: "unattached",
    })).toEqual({
      search: "hero",
      fileType: "image",
      source: "uploaded",
      retentionClass: "ephemeral",
      attached: false,
    });

    expect(parseUserMediaFilters({ type: "bad", attached: "maybe" })).toEqual({
      search: "",
      fileType: null,
      source: null,
      retentionClass: null,
      attached: null,
    });
  });

  it("loads user media with a quota snapshot derived from the current summary", async () => {
    const workspace = await loadUserMediaWorkspace("usr_1", { type: "image", attached: "unattached" });

    expect(listForUserMock).toHaveBeenCalledWith("usr_1", {
      limit: 50,
      fileType: "image",
      attached: false,
    });
    expect(getUserMediaStorageAccountMock).toHaveBeenCalledWith(expect.any(Object), "usr_1");
    expect(workspace.quota).toMatchObject({
      quotaBytes: 10 * 1024 * 1024 * 1024,
      usedBytes: 4096,
      status: "normal",
      hardBlockUploadsAtQuota: false,
    });
    expect(workspace.items[0].canDelete).toBe(true);
  });
});