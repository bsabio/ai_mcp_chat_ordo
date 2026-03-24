import { beforeEach, describe, expect, it, vi } from "vitest";

import { executeDirectChatTurn } from "./chat-turn";

const {
  buildMock,
  getAllMock,
  createMessageMock,
  orchestrateChatTurnMock,
  logEventMock,
  getSchemasForRoleMock,
  getToolExecutorFactoryMock,
} = vi.hoisted(() => ({
  buildMock: vi.fn(),
  getAllMock: vi.fn(),
  createMessageMock: vi.fn(),
  orchestrateChatTurnMock: vi.fn(),
  logEventMock: vi.fn(),
  getSchemasForRoleMock: vi.fn(),
  getToolExecutorFactoryMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: createMessageMock,
    };
  },
}));

vi.mock("@/lib/config/env", () => ({
  getAnthropicApiKey: vi.fn(() => "test-key"),
  getAnthropicRequestTimeoutMs: vi.fn(() => 10000),
  getAnthropicRequestRetryAttempts: vi.fn(() => 2),
  getAnthropicRequestRetryDelayMs: vi.fn(() => 150),
  getModelFallbacks: vi.fn(() => ["claude-haiku-4-5"]),
}));

vi.mock("@/lib/chat/policy", () => ({
  createSystemPromptBuilder: vi.fn(async () => ({
    withUserPreferences: vi.fn(),
    build: buildMock,
  })),
}));

vi.mock("@/adapters/UserPreferencesDataMapper", () => ({
  UserPreferencesDataMapper: class UserPreferencesDataMapper {
    getAll = getAllMock;
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/chat/orchestrator", () => ({
  orchestrateChatTurn: orchestrateChatTurnMock,
}));

vi.mock("@/lib/observability/logger", () => ({
  logEvent: logEventMock,
}));

vi.mock("@/lib/chat/tool-composition-root", () => ({
  getToolRegistry: vi.fn(() => ({
    getSchemasForRole: getSchemasForRoleMock,
  })),
  getToolExecutor: getToolExecutorFactoryMock,
}));

describe("executeDirectChatTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildMock.mockReturnValue("system prompt");
    getAllMock.mockResolvedValue([]);
    getSchemasForRoleMock.mockReturnValue([]);
    getToolExecutorFactoryMock.mockReturnValue(vi.fn());
    createMessageMock.mockResolvedValue({
      content: [{ type: "text", text: "hi" }],
    });
    orchestrateChatTurnMock.mockImplementation(async ({ provider }) => {
      await provider.createMessage({
        messages: [{ role: "user", content: "hello" }],
        toolChoice: { type: "auto" },
      });

      return "ok";
    });
  });

  it("logs provider resilience settings on successful provider calls", async () => {
    await executeDirectChatTurn({
      incomingMessages: [{ role: "user", content: "hello" }],
      user: { id: "usr_1", roles: ["ANONYMOUS"] },
      route: "/api/chat",
      requestId: "req_1",
    });

    expect(logEventMock).toHaveBeenCalledWith("info", "provider.call", {
      route: "/api/chat",
      requestId: "req_1",
      durationMs: expect.any(Number),
      isError: false,
      timeoutMs: 10000,
      retryAttempts: 2,
      retryDelayMs: 150,
    });
  });

  it("logs provider resilience settings on failed provider calls", async () => {
    createMessageMock.mockReset();
    createMessageMock.mockRejectedValue(new Error("Provider request timed out."));

    await expect(executeDirectChatTurn({
      incomingMessages: [{ role: "user", content: "hello" }],
      user: { id: "usr_1", roles: ["ANONYMOUS"] },
      route: "/api/chat",
      requestId: "req_2",
    })).rejects.toThrow("Anthropic provider error: Provider request timed out.");

    expect(logEventMock).toHaveBeenCalledWith("info", "provider.call", {
      route: "/api/chat",
      requestId: "req_2",
      durationMs: expect.any(Number),
      isError: true,
      timeoutMs: 10000,
      retryAttempts: 2,
      retryDelayMs: 150,
    });
  });
});