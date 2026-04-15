import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/logger", () => ({
  logEvent: vi.fn(),
}));

import { logEvent } from "@/lib/observability/logger";

import { createToolExecutionHookRunner, type ToolExecuteFn } from "./ToolMiddleware";
import { ToolCapabilityMiddleware } from "./ToolCapabilityMiddleware";

describe("permission denial logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures role-denied tool attempts as structured runtime data", async () => {
    const onToolDenied = vi.fn();
    const executeFn: ToolExecuteFn = vi.fn(async () => "unexpected");
    const runner = createToolExecutionHookRunner([
      new ToolCapabilityMiddleware({
        getDescriptor: vi.fn(() => ({ name: "admin_web_search" })),
        canExecute: vi.fn(() => false),
      } as never),
    ], executeFn);

    const result = await runner("admin_web_search", {}, {
      role: "ANONYMOUS",
      userId: "usr_1",
      conversationId: "conv_1",
      onToolDenied,
    });

    expect(result).toMatchObject({
      ok: false,
      action: "tool_permission_denied",
      toolName: "admin_web_search",
      role: "ANONYMOUS",
      reason: "role_denied",
    });
    expect(onToolDenied).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "admin_web_search",
      role: "ANONYMOUS",
      reason: "role_denied",
      conversationId: "conv_1",
    }));
    expect(logEvent).toHaveBeenCalledWith("warn", "tool.denied", expect.objectContaining({
      tool: "admin_web_search",
      role: "ANONYMOUS",
      reason: "role_denied",
    }));
    expect(executeFn).not.toHaveBeenCalled();
  });

  it("handles repeated denials within one turn consistently", async () => {
    const onToolDenied = vi.fn();
    const executeFn: ToolExecuteFn = vi.fn(async () => "unexpected");
    const runner = createToolExecutionHookRunner([
      new ToolCapabilityMiddleware({
        getDescriptor: vi.fn(() => ({ name: "calculator" })),
        canExecute: vi.fn(() => true),
      } as never),
    ], executeFn);

    const context = {
      role: "ADMIN" as const,
      userId: "usr_1",
      conversationId: "conv_1",
      conversationLane: "organization" as const,
      allowedToolNames: ["search_corpus"],
      onToolDenied,
    };

    const first = await runner("calculator", { operation: "add", a: 1, b: 1 }, context);
    const second = await runner("calculator", { operation: "add", a: 2, b: 2 }, context);

    expect(first).toMatchObject({ reason: "manifest_prefiltered", action: "tool_permission_denied" });
    expect(second).toMatchObject({ reason: "manifest_prefiltered", action: "tool_permission_denied" });
    expect(onToolDenied).toHaveBeenCalledTimes(2);
    expect(onToolDenied).toHaveBeenNthCalledWith(1, expect.objectContaining({
      toolName: "calculator",
      reason: "manifest_prefiltered",
      conversationId: "conv_1",
      lane: "organization",
      allowedToolCount: 1,
    }));
    expect(onToolDenied).toHaveBeenNthCalledWith(2, expect.objectContaining({
      toolName: "calculator",
      reason: "manifest_prefiltered",
      conversationId: "conv_1",
      lane: "organization",
      allowedToolCount: 1,
    }));
    expect(logEvent).toHaveBeenCalledTimes(2);
    expect(executeFn).not.toHaveBeenCalled();
  });
});