import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConversationInteractorMock } from "../../../../../tests/helpers/conversation-interactor-fixture";

const {
  resolveUserIdMock,
  getConversationMock,
  reapStaleChatUploadsMock,
  storeBinaryMock,
  deleteIfUnattachedMock,
} = vi.hoisted(() => ({
  resolveUserIdMock: vi.fn(),
  getConversationMock: vi.fn(),
  reapStaleChatUploadsMock: vi.fn(),
  storeBinaryMock: vi.fn(),
  deleteIfUnattachedMock: vi.fn(),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: resolveUserIdMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getConversationInteractor: vi.fn(() =>
    createConversationInteractorMock({
      get: getConversationMock,
    }),
  ),
}));

vi.mock("@/lib/chat/upload-reaper", () => ({
  reapStaleChatUploads: reapStaleChatUploadsMock,
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/adapters/UserFileDataMapper", () => ({
  UserFileDataMapper: class UserFileDataMapper {},
}));

vi.mock("@/lib/user-files", () => ({
  UserFileSystem: class UserFileSystem {
    storeBinary = storeBinaryMock;
    deleteIfUnattached = deleteIfUnattachedMock;
  },
}));

import { DELETE, POST } from "@/app/api/chat/uploads/route";

describe("POST /api/chat/uploads", () => {
  beforeEach(() => {
    resolveUserIdMock.mockResolvedValue({ userId: "usr_test", isAnonymous: true });
    getConversationMock.mockResolvedValue({ id: "conv_1" });
    reapStaleChatUploadsMock.mockResolvedValue({ deletedIds: [], deletedCount: 0 });
    storeBinaryMock.mockResolvedValue({
      id: "uf_1",
      mimeType: "text/plain",
      fileSize: 5,
    });
    deleteIfUnattachedMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stores uploaded files and returns attachment metadata", async () => {
    const formData = new FormData();
    formData.append(
      "files",
      new File(["brief"], "brief.txt", { type: "text/plain" }),
    );
    formData.append("conversationId", "conv_1");

    const response = await POST(
      {
        formData: async () => formData,
      } as unknown as Request,
    );

    expect(getConversationMock).toHaveBeenCalledWith("conv_1", "usr_test");
    expect(reapStaleChatUploadsMock).toHaveBeenCalledWith({ userId: "usr_test" });
    expect(storeBinaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "usr_test",
        conversationId: "conv_1",
        fileType: "document",
        mimeType: "text/plain",
        extension: "txt",
        metadata: expect.objectContaining({ source: "uploaded", retentionClass: "conversation" }),
      }),
    );

    const payload = (await response.json()) as {
      attachments: Array<{ assetId: string; fileName: string }>;
    };
    expect(payload.attachments).toEqual([
      expect.objectContaining({
        assetId: "uf_1",
        fileName: "brief.txt",
      }),
    ]);
  });

  it("rejects empty uploads", async () => {
    const response = await POST(
      {
        formData: async () => new FormData(),
      } as unknown as Request,
    );

    expect(response.status).toBe(400);
  });

  it("continues upload handling when stale-upload reaping fails", async () => {
    reapStaleChatUploadsMock.mockRejectedValueOnce(new Error("reaper down"));

    const formData = new FormData();
    formData.append(
      "files",
      new File(["brief"], "brief.txt", { type: "text/plain" }),
    );

    const response = await POST(
      {
        formData: async () => formData,
      } as unknown as Request,
    );

    expect(response.status).toBe(200);
    expect(storeBinaryMock).toHaveBeenCalledTimes(1);
  });

  it("classifies audio uploads as typed media attachments", async () => {
    storeBinaryMock.mockResolvedValueOnce({
      id: "uf_audio_1",
      mimeType: "audio/mpeg",
      fileSize: 7,
      metadata: {
        assetKind: "audio",
        source: "uploaded",
        retentionClass: "ephemeral",
      },
    });

    const formData = new FormData();
    formData.append(
      "files",
      new File(["audio"], "intro.mp3", { type: "audio/mpeg" }),
    );

    const response = await POST(
      {
        formData: async () => formData,
      } as unknown as Request,
    );

    expect(storeBinaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: "audio",
        mimeType: "audio/mpeg",
        metadata: expect.objectContaining({ assetKind: "audio", source: "uploaded" }),
      }),
    );

    const payload = await response.json() as {
      attachments: Array<{ assetKind?: string; source?: string }>;
    };
    expect(payload.attachments).toEqual([
      expect.objectContaining({ assetKind: "audio", source: "uploaded" }),
    ]);
  });

  it("stores derived browser-runtime chart assets through the same governed upload path", async () => {
    storeBinaryMock.mockResolvedValueOnce({
      id: "uf_chart_1",
      mimeType: "text/vnd.mermaid",
      fileSize: 21,
      metadata: {
        assetKind: "chart",
        source: "derived",
        retentionClass: "conversation",
      },
    });

    const formData = new FormData();
    formData.append(
      "files",
      new File(["flowchart TD\nA-->B"], "launch_flow.mmd", { type: "text/vnd.mermaid" }),
    );
    formData.append("conversationId", "conv_1");

    const response = await POST(
      {
        formData: async () => formData,
      } as unknown as Request,
    );

    expect(storeBinaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: "chart",
        mimeType: "text/vnd.mermaid",
        metadata: expect.objectContaining({ assetKind: "chart", source: "derived", retentionClass: "conversation" }),
      }),
    );

    const payload = await response.json() as {
      attachments: Array<{ assetKind?: string; source?: string; retentionClass?: string }>;
    };
    expect(payload.attachments).toEqual([
      expect.objectContaining({ assetKind: "chart", source: "derived", retentionClass: "conversation" }),
    ]);
  });

  it("rejects unsupported binary uploads", async () => {
    const formData = new FormData();
    formData.append(
      "files",
      new File(["zip"], "archive.zip", { type: "application/zip" }),
    );

    const response = await POST(
      {
        formData: async () => formData,
      } as unknown as Request,
    );

    expect(response.status).toBe(400);
  });

  it("cleans up unattached uploads for the current user", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/chat/uploads", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attachmentIds: ["uf_1", "uf_2"] }),
      }),
    );

    expect(deleteIfUnattachedMock).toHaveBeenNthCalledWith(1, "uf_1", "usr_test");
    expect(deleteIfUnattachedMock).toHaveBeenNthCalledWith(2, "uf_2", "usr_test");
    expect(response.status).toBe(200);
  });
});