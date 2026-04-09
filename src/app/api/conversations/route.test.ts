import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConversationRouteRequest,
  createConversationRouteServicesMock,
  createValidatedSessionUser,
  TEST_SESSION_TOKEN,
} from "../../../../tests/helpers/conversation-route-fixture";

const { list, ensureActive, validateSession } = vi.hoisted(() => ({
  list: vi.fn(),
  ensureActive: vi.fn(),
  validateSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSession,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () =>
    createConversationRouteServicesMock({
      list,
      ensureActive,
    }),
}));

import { GET, POST } from "./route";

describe("conversation collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateSession.mockResolvedValue(createValidatedSessionUser());
  });

  it("rejects unauthenticated collection reads", async () => {
    const response = await GET(createConversationRouteRequest("/api/conversations", "GET", false));

    expect(response.status).toBe(401);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it("lists conversations for the authenticated user", async () => {
    list.mockResolvedValue([{ id: "conv_1" }, { id: "conv_2" }]);

    const response = await GET(createConversationRouteRequest("/api/conversations", "GET"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(TEST_SESSION_TOKEN);
    expect(list).toHaveBeenCalledWith("usr_123");
    expect(payload.conversations).toEqual([{ id: "conv_1" }, { id: "conv_2" }]);
  });

  it("passes a valid scope through when listing conversations", async () => {
    list.mockResolvedValue([{ id: "conv_deleted" }]);

    const response = await GET(createConversationRouteRequest("/api/conversations?scope=deleted", "GET"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith("usr_123", { scope: "deleted" });
    expect(payload.conversations).toEqual([{ id: "conv_deleted" }]);
  });

  it("rejects unauthenticated conversation creation", async () => {
    const response = await POST(
      createConversationRouteRequest("/api/conversations", "POST", false),
    );

    expect(response.status).toBe(401);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it("ensures the active conversation for the authenticated user", async () => {
    ensureActive.mockResolvedValue({ id: "conv_active" });

    const response = await POST(createConversationRouteRequest("/api/conversations", "POST"));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(validateSession).toHaveBeenCalledWith(TEST_SESSION_TOKEN);
    expect(ensureActive).toHaveBeenCalledWith("usr_123");
    expect(payload.conversation).toEqual({ id: "conv_active" });
  });
});