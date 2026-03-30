import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function routePath(relativePath: string): string {
  return join(process.cwd(), relativePath);
}

function readSource(relativePath: string): string {
  return readFileSync(routePath(relativePath), "utf-8");
}

describe("/app/journal/page cutover guard", () => {
  it("creates a canonical /journal index route module with /journal metadata", () => {
    const relativePath = "src/app/journal/page.tsx";
    const exists = existsSync(routePath(relativePath));

    expect(exists).toBe(true);
    if (!exists) {
      return;
    }

    const src = readSource(relativePath);

    expect(src).toContain("/journal");
    expect(src).not.toContain("https://${identity.domain}/blog");
  });
});