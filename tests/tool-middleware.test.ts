import { describe, it, expect, vi } from "vitest";
import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";
import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { composeMiddleware } from "@/core/tool-registry/ToolMiddleware";
import { ToolAccessDeniedError } from "@/core/tool-registry/errors";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { logEvent } from "@/lib/observability/logger";

vi.mock("@/lib/observability/logger", () => ({
  logEvent: vi.fn(),
}));

const logEventMock = vi.mocked(logEvent);

function makeDescriptor(overrides: Partial<ToolDescriptor> = {}): ToolDescriptor {
  return {
    name: "calculator",
    schema: { description: "Calculate", input_schema: { type: "object" } },
    command: { async execute() { return { result: 42 }; } },
    roles: "ALL",
    category: "math",
    ...overrides,
  };
}

const ctx: ToolExecutionContext = { role: "AUTHENTICATED", userId: "user-1" };
const anonCtx: ToolExecutionContext = { role: "ANONYMOUS", userId: "anon" };

describe("ToolMiddleware", () => {
  // TEST-MW-01
  it("LoggingMiddleware logs START and SUCCESS on success", async () => {
    logEventMock.mockClear();
    const mw = new LoggingMiddleware();

    const next = vi.fn().mockResolvedValue({ result: 42 });
    const result = await mw.execute("calculator", {}, ctx, next);

    expect(result).toEqual({ result: 42 });
    expect(logEventMock).toHaveBeenCalledWith("info", "tool.start", expect.objectContaining({ tool: "calculator", role: "AUTHENTICATED" }));
    expect(logEventMock).toHaveBeenCalledWith("info", "tool.success", expect.objectContaining({ tool: "calculator", durationMs: expect.any(Number) }));
  });

  // TEST-MW-02
  it("LoggingMiddleware logs ERROR on failure", async () => {
    logEventMock.mockClear();
    const mw = new LoggingMiddleware();
    const error = new Error("boom");

    const next = vi.fn().mockRejectedValue(error);
    await expect(mw.execute("calculator", {}, ctx, next)).rejects.toThrow("boom");

    expect(logEventMock).toHaveBeenCalledWith("info", "tool.start", expect.objectContaining({ tool: "calculator", role: "AUTHENTICATED" }));
    expect(logEventMock).toHaveBeenCalledWith("error", "tool.error", expect.objectContaining({ tool: "calculator", durationMs: expect.any(Number), error: "boom" }));
  });

  // TEST-MW-03
  it("RbacGuardMiddleware blocks ANONYMOUS from restricted tool", async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeDescriptor({
        name: "restricted_tool",
        roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
        category: "system",
      }),
    );

    const mw = new RbacGuardMiddleware(registry);
    const next = vi.fn().mockResolvedValue("ok");

    await expect(
      mw.execute("restricted_tool", {}, anonCtx, next),
    ).rejects.toThrow(ToolAccessDeniedError);
    expect(next).not.toHaveBeenCalled();
  });

  // TEST-MW-04
  it("RbacGuardMiddleware allows AUTHENTICATED access to restricted tool", async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeDescriptor({
        name: "restricted_tool",
        roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
        category: "system",
      }),
    );

    const mw = new RbacGuardMiddleware(registry);
    const next = vi.fn().mockResolvedValue("ok");

    const result = await mw.execute("restricted_tool", {}, ctx, next);
    expect(result).toBe("ok");
    expect(next).toHaveBeenCalledOnce();
  });

  // TEST-MW-05
  it("composed chain: logging → RBAC → execute; RBAC rejection is logged with timing", async () => {
    logEventMock.mockClear();

    const registry = new ToolRegistry();
    registry.register(
      makeDescriptor({
        name: "restricted_tool",
        roles: ["ADMIN"],
        category: "system",
      }),
    );

    const logging = new LoggingMiddleware();
    const rbac = new RbacGuardMiddleware(registry);

    const innerExecute = vi.fn().mockResolvedValue("should not reach");
    const chain = composeMiddleware([logging, rbac], innerExecute);

    await expect(chain("restricted_tool", {}, anonCtx)).rejects.toThrow(ToolAccessDeniedError);

    // Logging should have captured the START and ERROR
    expect(logEventMock).toHaveBeenCalledWith("info", "tool.start", expect.objectContaining({ tool: "restricted_tool", role: "ANONYMOUS" }));
    expect(logEventMock).toHaveBeenCalledWith("error", "tool.error", expect.objectContaining({ tool: "restricted_tool", durationMs: expect.any(Number) }));

    // The inner execute should never have been called
    expect(innerExecute).not.toHaveBeenCalled();
  });
});
