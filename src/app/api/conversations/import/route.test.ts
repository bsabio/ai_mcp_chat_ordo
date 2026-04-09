import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConversationRouteRequest,
  createConversationRouteServicesMock,
} from "../../../../../tests/helpers/conversation-route-fixture";

const { importConversation, resolveUserId } = vi.hoisted(() => ({
  importConversation: vi.fn(),
  resolveUserId: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      importConversation,
    }),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId,
}));

import { POST } from "./route";

const VALID_EXPORT_PAYLOAD = {
  version: 1,
  exportedAt: "2026-04-08T12:00:00.000Z",
  conversation: {
    id: "conv_source",
    title: "Imported ops review",
    status: "archived",
    createdAt: "2026-04-08T10:00:00.000Z",
    updatedAt: "2026-04-08T11:00:00.000Z",
    messageCount: 1,
    sessionSource: "authenticated",
    promptVersion: 4,
    routingSnapshot: {
      lane: "organization",
      confidence: 0.88,
    },
    referralSource: null,
  },
  messages: [
    {
      id: "msg_source_1",
      role: "user",
      content: "Please export this thread.",
      parts: [{ type: "text", text: "Please export this thread." }],
      createdAt: "2026-04-08T10:05:00.000Z",
      tokenEstimate: 6,
      attachmentManifestIds: [],
    },
  ],
  attachmentManifest: [],
  jobReferences: [],
};

describe("conversation import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserId.mockResolvedValue({ userId: "usr_123", isAnonymous: false });
  });

  it("imports a valid platform export payload into a new archived conversation", async () => {
    importConversation.mockResolvedValue({
      conversation: {
        id: "conv_imported",
        userId: "usr_123",
        title: "Imported ops review",
        status: "archived",
      },
      messages: [
        {
          id: "msg_imported_1",
          role: "user",
          content: "Please export this thread.",
          parts: [{ type: "text", text: "Please export this thread." }],
          createdAt: "2026-04-08T10:05:00.000Z",
        },
      ],
    });

    const response = await POST(
      createConversationRouteRequest(
        "/api/conversations/import",
        "POST",
        true,
        { payload: JSON.stringify(VALID_EXPORT_PAYLOAD) },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(resolveUserId).toHaveBeenCalled();
    expect(importConversation).toHaveBeenCalledWith(
      "usr_123",
      expect.objectContaining({
        payload: expect.objectContaining({
          conversation: expect.objectContaining({ id: "conv_source" }),
        }),
      }),
    );
    expect(payload.conversation.id).toBe("conv_imported");
    expect(payload.messages[0].id).toBe("msg_imported_1");
  });

  it("rejects schema-invalid import payloads", async () => {
    const response = await POST(
      createConversationRouteRequest(
        "/api/conversations/import",
        "POST",
        true,
        { payload: "not valid json" },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(importConversation).not.toHaveBeenCalled();
    expect(payload.error).toContain("valid JSON");
  });
});