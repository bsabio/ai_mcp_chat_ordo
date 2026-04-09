import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationValidationError, NotFoundError } from "@/core/use-cases/ConversationInteractor";
import {
  createConversationRouteParams,
  createConversationRouteRequest,
  createConversationRouteServicesMock,
  createValidatedSessionUser,
  TEST_SESSION_TOKEN,
} from "../../../../../tests/helpers/conversation-route-fixture";

const {
  getConversation,
  deleteConversation,
  renameConversation,
  archiveConversation,
  restoreConversation,
  validateSession,
} = vi.hoisted(() => ({
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  renameConversation: vi.fn(),
  archiveConversation: vi.fn(),
  restoreConversation: vi.fn(),
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
      rename: renameConversation,
      archive: archiveConversation,
      restore: restoreConversation,
    }),
}));

import { DELETE, GET, PATCH } from "./route";

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

  it("renames a conversation for the authenticated user", async () => {
    renameConversation.mockResolvedValue(undefined);

    const response = await PATCH(
      createConversationRouteRequest(
        "/api/conversations/conv_1",
        "PATCH",
        true,
        { action: "rename", title: "Renamed chat" },
      ),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(renameConversation).toHaveBeenCalledWith("conv_1", "usr_123", "Renamed chat");
    expect(payload.renamed).toBe(true);
  });

  it("archives a conversation for the authenticated user", async () => {
    archiveConversation.mockResolvedValue(undefined);

    const response = await PATCH(
      createConversationRouteRequest(
        "/api/conversations/conv_1",
        "PATCH",
        true,
        { action: "archive" },
      ),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(archiveConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(payload.archived).toBe(true);
  });

  it("moves a conversation to trash for the authenticated user", async () => {
    deleteConversation.mockResolvedValue(undefined);

    const response = await PATCH(
      createConversationRouteRequest(
        "/api/conversations/conv_1",
        "PATCH",
        true,
        { action: "move_to_trash" },
      ),
      createConversationRouteParams("conv_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteConversation).toHaveBeenCalledWith("conv_1", "usr_123");
    expect(payload.deleted).toBe(true);
  });

  it("returns 400 for invalid rename input", async () => {
    renameConversation.mockRejectedValue(new ConversationValidationError("Conversation title cannot be empty"));

    const response = await PATCH(
      createConversationRouteRequest(
        "/api/conversations/conv_1",
        "PATCH",
        true,
        { action: "rename", title: "   " },
      ),
      createConversationRouteParams("conv_1"),
    );

    expect(response.status).toBe(400);
  });
});