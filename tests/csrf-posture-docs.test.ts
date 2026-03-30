import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Spec 11: CSRF Posture Documentation", () => {
  it("CSRF posture document exists and contains Accepted risks section", () => {
    const path = join(process.cwd(), "docs/operations/csrf-posture.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("Accepted risks");
  });
});
