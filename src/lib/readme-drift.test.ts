import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { corpusConfig } from "@/lib/corpus-vocabulary";

const README_PATH_1 = path.resolve(process.cwd(), "docs/_corpus/system-docs/chapters/01-proof-story-and-value.md");
const README_PATH_4 = path.resolve(process.cwd(), "docs/_corpus/system-docs/chapters/04-tooling-and-mcp.md");

describe("README runtime drift", () => {
  const readme1 = readFileSync(README_PATH_1, "utf8");
  const readme4 = readFileSync(README_PATH_4, "utf8");

  it("documents the current corpus counts", () => {
    expect(readme1).toContain(`${corpusConfig.documentCount} books and ${corpusConfig.sectionCount} chapters`);
  });

  it("does not preserve the stale hardcoded corpus totals", () => {
    expect(readme1).not.toContain("8 books");
    expect(readme1).not.toContain("61 chapters");
    expect(readme1).not.toContain("10 books");
  });

  it("documents that runtime tool availability comes from the registry", () => {
    expect(readme4).toContain("The exact manifest is role-scoped and composed at runtime");
    expect(readme4).toContain("Treat the registry as the definitive source of truth for exact tool availability.");
  });
});