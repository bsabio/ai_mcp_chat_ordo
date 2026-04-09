import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { corpusConfig } from "@/lib/corpus-vocabulary";

const README_PATH = path.resolve(process.cwd(), "README.md");

describe("README runtime drift", () => {
  const readme = readFileSync(README_PATH, "utf8");

  it("documents the current corpus counts", () => {
    expect(readme).toContain(`${corpusConfig.documentCount} books and ${corpusConfig.sectionCount} chapters`);
  });

  it("does not preserve the stale hardcoded corpus totals", () => {
    expect(readme).not.toContain("8 books");
    expect(readme).not.toContain("61 chapters");
  });

  it("documents that runtime tool availability comes from the registry", () => {
    expect(readme).toContain("The exact manifest is role-scoped and composed at runtime");
    expect(readme).toContain("Treat the registry as the source of truth for exact tool availability.");
  });
});