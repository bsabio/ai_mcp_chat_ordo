import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import {
  createConversationRouteParams,
  createConversationRouteRequest,
  createConversationRouteServicesMock,
  createValidatedSessionUser,
  TEST_SESSION_TOKEN,
} from "../../../../../tests/helpers/conversation-route-fixture";

const { getConversation, deleteConversation, validateSession } = vi.hoisted(() => ({
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  validateSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSession,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      get: getConversation,
      delete: deleteConversation,
    }),
}));

import { DELETE, GET } from "./route";

describe("conversation detail routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateSession.mockResolvedValue(createValidatedSessionUser());
  });

  it("rejects unauthenticated conversation detail reads", async () => {
    const response = await GET(
      createConversationRouteRequest("/api/conversations/conv_1", "GET", false),
      createConversationRouteParams("conv_1"),
    );

    expect(response.status).toBe(401);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it("returns conversation detail for the authenticated user", async () => {
    getConversation.mockResolvedValue({
      conversation: { id: "conv_1" },
      messages: [{ id: "msg_1", content: "Hello" }],
    });

    const response = await GET(
      createConversationRouteRequest("/api/conversations/conv_1", "GET"),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(TEST_SESSION_TOKEN);
    expect(getConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(payload.conversation).toEqual({ id: "conv_1" });
    expect(payload.messages).toEqual([{ id: "msg_1", content: "Hello" }]);
  });

  it("returns 404 when the requested conversation does not exist", async () => {
    getConversation.mockRejectedValue(new NotFoundError("Conversation not found"));

    const response = await GET(
      createConversationRouteRequest("/api/conversations/missing", "GET"),
      createConversationRouteParams("missing"),
    );

    expect(response.status).toBe(404);
  });

  it("rejects unauthenticated conversation deletion", async () => {
    const response = await DELETE(
      createConversationRouteRequest("/api/conversations/conv_1", "DELETE", false),
      createConversationRouteParams("conv_1"),
    );

    expect(response.status).toBe(401);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it("deletes a conversation for the authenticated user", async () => {
    deleteConversation.mockResolvedValue(undefined);

    const response = await DELETE(
      createConversationRouteRequest("/api/conversations/conv_1", "DELETE"),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(TEST_SESSION_TOKEN);
    expect(deleteConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(payload.deleted).toBe(true);
  });

  it("returns 404 when deleting a missing conversation", async () => {
    deleteConversation.mockRejectedValue(new NotFoundError("Conversation not found"));

    const response = await DELETE(
      createConversationRouteRequest("/api/conversations/missing", "DELETE"),
      createConversationRouteParams("missing"),
    );

    expect(response.status).toBe(404);
  });
});