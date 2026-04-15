import { beforeEach, describe, expect, it, vi } from "vitest";

const { logEventMock } = vi.hoisted(() => ({
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logEvent: logEventMock,
}));

import { LoggingMiddleware } from "./LoggingMiddleware";

describe("LoggingMiddleware runtime hooks", () => {
  beforeEach(() => {
    logEventMock.mockReset();
  });

  it("includes session-resolution fields in turn completion success logs", async () => {
    const middleware = new LoggingMiddleware();

    await middleware.afterTurnCompletion({
      routeContext: {
        route: "/api/chat/stream",
        requestId: "req_1",
        startedAt: Date.now() - 10,
      },
      conversationId: "conv_1",
      userId: "usr_1",
      role: "AUTHENTICATED",
      streamId: "stream_1",
      status: "completed",
      assistantText: "Here is the rollout plan.",
      assistantParts: [],
      persistedMessageId: "msg_1",
      sessionResolutionKind: "advanced",
      sessionResolutionReason: "actionable_next_steps",
      sessionResolutionResponseState: "open",
      meta: { startedAt: Date.now() - 10 },
    });

    expect(logEventMock).toHaveBeenCalledWith(
      "info",
      "chat.turn_completion.success",
      expect.objectContaining({
        conversationId: "conv_1",
        sessionResolutionKind: "advanced",
        sessionResolutionReason: "actionable_next_steps",
        sessionResolutionResponseState: "open",
      }),
    );
  });
});