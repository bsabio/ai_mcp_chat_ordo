import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createActiveConversationResult,
  createConversationRouteRequest,
  createConversationRouteServicesMock,
} from "../../../../../tests/helpers/conversation-route-fixture";

const { getActiveForUser, archiveActive, resolveUserId, embedConversation } = vi.hoisted(() => ({
  getActiveForUser: vi.fn(),
  archiveActive: vi.fn(),
  resolveUserId: vi.fn(),
  embedConversation: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      getActiveForUser,
      archiveActive,
    }),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId,
}));

vi.mock("@/lib/chat/embed-conversation", () => ({
  embedConversation,
}));

import { GET as getActiveConversation } from "./route";
import { POST as archiveActiveConversation } from "./archive/route";

describe("active conversation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedConversation.mockResolvedValue(undefined);
  });

  it("restores an anonymous user's active conversation", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    getActiveForUser.mockResolvedValue(createActiveConversationResult());

    const response = await getActiveConversation(
      createConversationRouteRequest("/api/conversations/active"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(resolveUserId).toHaveBeenCalled();
    expect(getActiveForUser).toHaveBeenCalledWith("anon_123");
    expect(payload.conversation.id).toBe("conv_1");
    expect(payload.conversation.routingSnapshot.lane).toBe("organization");
  });

  it("returns 404 when no active conversation exists for anonymous user", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    getActiveForUser.mockResolvedValue(null);

    const response = await getActiveConversation(
      createConversationRouteRequest("/api/conversations/active"),
    );

    expect(response.status).toBe(404);
  });

  it("archives an anonymous active conversation without embedding it", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    archiveActive.mockResolvedValue({ id: "conv_1" });

    const response = await archiveActiveConversation(
      createConversationRouteRequest("/api/conversations/active/archive", "POST"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(archiveActive).toHaveBeenCalledWith("anon_123");
    expect(embedConversation).not.toHaveBeenCalled();
    expect(payload.conversationId).toBe("conv_1");
  });

  it("embeds archived authenticated conversations for search", async () => {
    resolveUserId.mockResolvedValue({ userId: "usr_123", isAnonymous: false });
    archiveActive.mockResolvedValue({ id: "conv_2" });

    const response = await archiveActiveConversation(
      createConversationRouteRequest("/api/conversations/active/archive", "POST"),
    );

    expect(response.status).toBe(200);
    expect(embedConversation).toHaveBeenCalledWith("conv_2", "usr_123");
  });
});