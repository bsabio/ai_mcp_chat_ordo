import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConversationRouteParams,
  createConversationRouteRequest,
  createConversationRouteServicesMock,
} from "../../../../../../tests/helpers/conversation-route-fixture";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";

const { exportConversation, resolveUserId } = vi.hoisted(() => ({
  exportConversation: vi.fn(),
  resolveUserId: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      exportConversation,
    }),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId,
}));

import { GET } from "./route";

describe("conversation export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserId.mockResolvedValue({ userId: "usr_123", isAnonymous: false });
  });

  it("returns an exact platform export payload for the current owner", async () => {
    exportConversation.mockResolvedValue({
      version: 1,
      exportedAt: "2026-04-08T12:00:00.000Z",
      conversation: {
        id: "conv_1",
        title: "Imported ops review",
        status: "archived",
        createdAt: "2026-04-08T10:00:00.000Z",
        updatedAt: "2026-04-08T11:00:00.000Z",
        messageCount: 1,
        sessionSource: "authenticated",
        promptVersion: 4,
        routingSnapshot: { lane: "organization", confidence: 0.88 },
        referralSource: null,
      },
      messages: [],
      attachmentManifest: [],
      jobReferences: [],
    });

    const response = await GET(
      createConversationRouteRequest("/api/conversations/conv_1/export"),
      createConversationRouteParams("conv_1"),
    );
    const payload = JSON.parse(await response.text()) as { conversation: { id: string } };

    expect(response.status).toBe(200);
    expect(resolveUserId).toHaveBeenCalled();
    expect(exportConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(response.headers.get("content-disposition")).toContain("conversation-conv_1.json");
    expect(payload.conversation.id).toBe("conv_1");
  });

  it("returns 404 when the conversation is not available to the current owner", async () => {
    exportConversation.mockRejectedValue(new NotFoundError("Conversation not found"));

    const response = await GET(
      createConversationRouteRequest("/api/conversations/missing/export"),
      createConversationRouteParams("missing"),
    );

    expect(response.status).toBe(404);
  });
});