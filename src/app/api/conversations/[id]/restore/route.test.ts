import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import {
  createConversationRouteParams,
  createConversationRouteRequest,
  createConversationRouteServicesMock,
  createValidatedSessionUser,
  TEST_SESSION_TOKEN,
} from "../../../../../../tests/helpers/conversation-route-fixture";

const { restoreConversation, validateSession } = vi.hoisted(() => ({
  restoreConversation: vi.fn(),
  validateSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSession,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      restore: restoreConversation,
    }),
}));

import { POST } from "./route";

describe("conversation restore route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateSession.mockResolvedValue(createValidatedSessionUser());
  });

  it("rejects unauthenticated restore requests", async () => {
    const response = await POST(
      createConversationRouteRequest("/api/conversations/conv_1/restore", "POST", false),
      createConversationRouteParams("conv_1"),
    );

    expect(response.status).toBe(401);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it("restores a deleted conversation for the authenticated user", async () => {
    restoreConversation.mockResolvedValue(undefined);

    const response = await POST(
      createConversationRouteRequest("/api/conversations/conv_1/restore", "POST"),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(TEST_SESSION_TOKEN);
    expect(restoreConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(payload.restored).toBe(true);
  });

  it("returns 404 when restoring a missing conversation", async () => {
    restoreConversation.mockRejectedValue(new NotFoundError("Conversation not found"));

    const response = await POST(
      createConversationRouteRequest("/api/conversations/missing/restore", "POST"),
      createConversationRouteParams("missing"),
    );

    expect(response.status).toBe(404);
  });
});