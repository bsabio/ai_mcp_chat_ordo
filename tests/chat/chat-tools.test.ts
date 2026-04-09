import { describe, expect, it } from "vitest";
import { getToolsForRole } from "@/lib/chat/tools";
import { getToolComposition } from "@/lib/chat/tool-composition-root";

describe("chat tools", () => {
  it("executor returns correct result for calculator add", async () => {
    const { executor } = getToolComposition();
    const result = await executor(
      "calculator",
      { operation: "add", a: 2, b: 3 },
      { role: "ANONYMOUS", userId: "test" },
    );
    expect(JSON.stringify(result)).toContain('"result":5');
  });

  it("executor rejects invalid calculator operation", async () => {
    const { executor } = getToolComposition();
    await expect(
      executor("calculator", { operation: "pow", a: 2, b: 3 }, { role: "ANONYMOUS", userId: "test" }),
    ).rejects.toThrow();
  });

  it("executor rejects unknown tool", async () => {
    const { executor } = getToolComposition();
    await expect(
      executor("unknown_tool", {}, { role: "ANONYMOUS", userId: "test" }),
    ).rejects.toThrow();
  });

  it("exposes member-safe job status tools for signed-in roles only", () => {
    const authenticated = getToolsForRole("AUTHENTICATED").map((tool) => tool.name);
    const anonymous = getToolsForRole("ANONYMOUS").map((tool) => tool.name);

    expect(authenticated).toContain("list_my_jobs");
    expect(authenticated).toContain("get_my_job_status");
    expect(anonymous).not.toContain("list_my_jobs");
    expect(anonymous).not.toContain("get_my_job_status");
  });
});
