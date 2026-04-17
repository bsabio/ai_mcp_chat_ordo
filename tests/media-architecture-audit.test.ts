import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("media platform architecture", () => {
  it("chat upload route delegates deterministic quota enforcement through governed user-file helpers", () => {
    const src = readSource("src/app/api/chat/uploads/route.ts");

    expect(src).toContain("getMediaQuotaPolicy");
    expect(src).toContain("storeBinaryBatchWithinQuota");
    expect(src).not.toMatch(/from\s+[\"']@\/lib\/db[\"']/);
    expect(src).not.toMatch(/from\s+[\"']node:fs[\"']/);
    expect(src).not.toMatch(/from\s+[\"']fs[\"']/);
    expect(src).not.toContain("getUserMediaStorageAccount");
    expect(src).not.toContain("buildMediaQuotaSnapshot");
  });

  it("chat upload route keeps cleanup inside governed user-file helpers", () => {
    const src = readSource("src/app/api/chat/uploads/route.ts");

    expect(src).toContain("reapStaleChatUploads");
    expect(src).toContain("deleteIfUnattached");
    expect(src).not.toContain("listUnattachedCreatedBefore");
    expect(src).not.toContain("unlinkSync");
  });

  it("my media page stays a thin authenticated shell over the user workspace loader", () => {
    const src = readSource("src/app/my/media/page.tsx");

    expect(src).toContain("getSessionUser");
    expect(src).toContain("loadUserMediaWorkspace");
    expect(src).not.toMatch(/from\s+[\"']@\/lib\/db[\"']/);
    expect(src).not.toContain("getUserMediaStorageAccount(");
  });

  it("operations media page stays a thin access-gated shell over the operations workspace loader", () => {
    const src = readSource("src/app/operations/media/page.tsx");

    expect(src).toContain("requireOperationsWorkspaceAccess");
    expect(src).toContain("loadOperationsMediaWorkspace");
    expect(src).not.toMatch(/from\s+[\"']@\/lib\/db[\"']/);
    expect(src).not.toContain("getFleetMediaStorageAccount(");
  });
});
