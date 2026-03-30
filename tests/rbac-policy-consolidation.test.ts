import { describe, it, expect, vi } from "vitest";
import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";
import { ToolAccessDeniedError, UnknownToolError } from "@/core/tool-registry/errors";
import { composeMiddleware } from "@/core/tool-registry/ToolMiddleware";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

function makeDescriptor(name: string, roles: ToolDescriptor["roles"]): ToolDescriptor {
  return {
    name,
    schema: { description: `Test tool: ${name}`, input_schema: { type: "object", properties: {} } },
    command: { execute: vi.fn().mockResolvedValue(`result:${name}`) },
    roles,
    category: "system",
  } as unknown as ToolDescriptor;
}

const ctx = (role: string): ToolExecutionContext =>
  ({ role, userId: "u1", conversationId: "c1" }) as ToolExecutionContext;

describe("RBAC Policy Consolidation", () => {
  it("RbacGuardMiddleware rejects tool call when role is not in descriptor.roles", async () => {
    const registry = new ToolRegistry();
    registry.register(makeDescriptor("admin_tool", ["ADMIN"]));
    const mw = new RbacGuardMiddleware(registry);
    const next = vi.fn();

    await expect(
      mw.execute("admin_tool", {}, ctx("STAFF"), next),
    ).rejects.toThrow(ToolAccessDeniedError);
    expect(next).not.toHaveBeenCalled();
  });

  it("RbacGuardMiddleware passes through when role matches", async () => {
    const registry = new ToolRegistry();
    registry.register(makeDescriptor("shared_tool", ["ADMIN", "STAFF"]));
    const mw = new RbacGuardMiddleware(registry);
    const next = vi.fn().mockResolvedValue("ok");

    const result = await mw.execute("shared_tool", {}, ctx("STAFF"), next);
    expect(result).toBe("ok");
    expect(next).toHaveBeenCalled();
  });

  it("RbacGuardMiddleware throws UnknownToolError for unregistered tool", async () => {
    const registry = new ToolRegistry();
    const mw = new RbacGuardMiddleware(registry);
    const next = vi.fn();

    await expect(
      mw.execute("nonexistent", {}, ctx("ADMIN"), next),
    ).rejects.toThrow(UnknownToolError);
  });

  it("ToolRegistry.execute() still enforces RBAC inline", async () => {
    const registry = new ToolRegistry();
    const desc = makeDescriptor("admin_only", ["ADMIN"]);
    registry.register(desc);

    // ToolRegistry.execute() retains inline RBAC check; middleware provides
    // the first guard but the registry is the authoritative enforcement point
    await expect(
      registry.execute("admin_only", {}, ctx("STAFF")),
    ).rejects.toThrow(ToolAccessDeniedError);
  });

  it("canExecute() still returns correct boolean", () => {
    const registry = new ToolRegistry();
    registry.register(makeDescriptor("t1", ["ADMIN", "STAFF"]));
    registry.register(makeDescriptor("t2", ["ADMIN"]));

    expect(registry.canExecute("t1", "STAFF")).toBe(true);
    expect(registry.canExecute("t2", "STAFF")).toBe(false);
    expect(registry.canExecute("t2", "ADMIN")).toBe(true);
    expect(registry.canExecute("nonexistent", "ADMIN")).toBe(false);
  });

  it("error types carry toolName and role properties", () => {
    const denied = new ToolAccessDeniedError("my_tool", "STAFF");
    expect(denied.toolName).toBe("my_tool");
    expect(denied.role).toBe("STAFF");
    expect(denied.name).toBe("ToolAccessDeniedError");

    const unknown = new UnknownToolError("missing_tool");
    expect(unknown.toolName).toBe("missing_tool");
    expect(unknown.name).toBe("UnknownToolError");
  });

  it("full executor pipeline enforces RBAC via middleware and registry", async () => {
    const registry = new ToolRegistry();
    const desc = makeDescriptor("tool_a", ["ADMIN", "STAFF"]);
    registry.register(desc);

    const canExecuteSpy = vi.spyOn(registry, "canExecute");
    const mw = new RbacGuardMiddleware(registry);
    const pipeline = composeMiddleware(
      [mw],
      (name, input, context) => registry.execute(name, input, context),
    );

    await pipeline("tool_a", {}, ctx("STAFF"));
    // canExecute is called twice: once in RbacGuardMiddleware, once in registry.execute()
    expect(canExecuteSpy).toHaveBeenCalledTimes(2);
  });
});
