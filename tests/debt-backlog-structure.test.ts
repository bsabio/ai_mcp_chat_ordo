import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REGISTRY_PATH = join(
  __dirname,
  "..",
  "docs/_refactor/system_debt_cleaning/15-debt-backlog-formalization/DEBT_REGISTRY.md",
);

function parseEntries(content: string) {
  const entries: { id: string; body: string }[] = [];
  const pattern = /^### (DEBT-\d+):/gm;
  let match: RegExpExecArray | null;
  const positions: { id: string; start: number }[] = [];

  while ((match = pattern.exec(content)) !== null) {
    positions.push({ id: match[1], start: match.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : content.length;
    entries.push({
      id: positions[i].id,
      body: content.slice(positions[i].start, end),
    });
  }
  return entries;
}

describe("Spec 15 — Debt Backlog Structure", () => {
  it("DEBT_REGISTRY.md exists", () => {
    expect(existsSync(REGISTRY_PATH)).toBe(true);
  });

  it("every debt entry has required fields", () => {
    const content = readFileSync(REGISTRY_PATH, "utf-8");
    const entries = parseEntries(content);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const requiredFields = [
      "Location:",
      "Severity:",
      "Category:",
      "Status:",
      "Description:",
      "Acceptance Criteria",
    ];

    const missing: string[] = [];
    for (const entry of entries) {
      for (const field of requiredFields) {
        if (!entry.body.includes(field)) {
          missing.push(`${entry.id} missing "${field}"`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("no duplicate DEBT IDs", () => {
    const content = readFileSync(REGISTRY_PATH, "utf-8");
    const entries = parseEntries(content);
    const ids = entries.map((e) => e.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it("resolved items reference a spec or PR", () => {
    const content = readFileSync(REGISTRY_PATH, "utf-8");
    const entries = parseEntries(content);
    const violations: string[] = [];

    for (const entry of entries) {
      if (/Status:\s*Resolved/i.test(entry.body)) {
        const relatedMatch = entry.body.match(/Related Specs:\s*(.+)/);
        if (!relatedMatch || relatedMatch[1].trim() === "None" || relatedMatch[1].trim() === "") {
          violations.push(`${entry.id} is Resolved but has no Related Specs`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
