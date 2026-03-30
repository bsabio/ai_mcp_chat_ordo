import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("Spec 09 — no new LocalEmbedder instances in src/", () => {
  it('no files in src/ use "new LocalEmbedder()"', () => {
    // grep returns exit code 1 when no matches — execSync throws on non-zero
    let matches = "";
    try {
      matches = execSync(
        'grep -rn "new LocalEmbedder()" src/ --include="*.ts" --include="*.tsx"',
        { cwd: process.cwd(), encoding: "utf-8" },
      );
    } catch {
      // grep exit 1 = no matches, which is what we want
      matches = "";
    }

    // Filter out the singleton creation line in LocalEmbedder.ts itself
    const violations = matches
      .split("\n")
      .filter((line) => line.trim() !== "")
      .filter((line) => !line.includes("src/adapters/LocalEmbedder.ts"));

    expect(violations).toEqual([]);
  });
});
