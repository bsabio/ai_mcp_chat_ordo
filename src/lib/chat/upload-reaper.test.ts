import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  reapUnattachedFilesMock,
} = vi.hoisted(() => ({
  reapUnattachedFilesMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserFileDataMapper: vi.fn(() => ({})),
}));

vi.mock("@/lib/user-files", async () => {
  const actual = await vi.importActual("@/lib/user-files");

  return {
    ...actual,
    UserFileSystem: class UserFileSystem {
      reapUnattachedFiles = reapUnattachedFilesMock;
    },
  };
});

import { CHAT_UPLOAD_REAPER_TTL_MINUTES } from "@/lib/user-files";
import { reapStaleChatUploads } from "@/lib/chat/upload-reaper";

describe("reapStaleChatUploads", () => {
  beforeEach(() => {
    reapUnattachedFilesMock.mockResolvedValue(["uf_stale_1"]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the server-owned stale upload sweep scoped to unattached documents", async () => {
    const result = await reapStaleChatUploads({
      olderThanMinutes: 15,
      userId: "usr_test",
    });

    expect(reapUnattachedFilesMock).toHaveBeenCalledWith({
      olderThanMinutes: 15,
      userId: "usr_test",
      fileType: "document",
    });
    expect(result).toEqual({
      deletedCount: 1,
      deletedIds: ["uf_stale_1"],
      olderThanMinutes: 15,
      userId: "usr_test",
    });
  });

  it("uses the default chat upload TTL when no explicit cutoff is provided", async () => {
    await reapStaleChatUploads();

    expect(reapUnattachedFilesMock).toHaveBeenCalledWith({
      olderThanMinutes: CHAT_UPLOAD_REAPER_TTL_MINUTES,
      userId: undefined,
      fileType: "document",
    });
  });
});
