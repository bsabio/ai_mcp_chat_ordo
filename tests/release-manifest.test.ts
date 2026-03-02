import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release manifest", () => {
  it("contains required release metadata keys after generation", () => {
    const filePath = path.join(process.cwd(), "release", "manifest.json");
    expect(fs.existsSync(filePath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    expect(typeof manifest.appName).toBe("string");
    expect(typeof manifest.version).toBe("string");
    expect(typeof manifest.gitSha).toBe("string");
    expect(typeof manifest.builtAt).toBe("string");
    expect(typeof manifest.nodeVersion).toBe("string");
  });
});
