import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(__dirname, "..", "src");

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("Spec 16 — Compatibility Layer Sunset", () => {
  it("all @deprecated symbols have a sunset date in JSDoc", () => {
    const srcFiles = collectTsFiles(SRC_ROOT);
    const missingDates: string[] = [];
    const datePattern = /Remove (after|by|in) \d/;

    for (const file of srcFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("@deprecated")) {
          // Look at this line and the surrounding JSDoc block for a date
          const blockStart = Math.max(0, i - 5);
          const blockEnd = Math.min(lines.length, i + 3);
          const block = lines.slice(blockStart, blockEnd).join("\n");
          if (!datePattern.test(block)) {
            const rel = relative(join(__dirname, ".."), file);
            missingDates.push(`${rel}:${i + 1}`);
          }
        }
      }
    }

    expect(missingDates).toEqual([]);
  });

  it("no re-export-only compatibility files exist without @deprecated annotation", () => {
    const srcFiles = collectTsFiles(SRC_ROOT);
    const unannotated: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));

      if (lines.length === 0) continue;

      // A file is "re-export only" if every non-blank, non-comment line is an
      // export-from statement or a type import
      const isReExportOnly = lines.every(
        (l) => /^export\s+(type\s+)?\{.*\}\s+from\s+/.test(l) || /^import\s+type\s+/.test(l),
      );

      if (isReExportOnly && !content.includes("@deprecated")) {
        // Allowlist: pure convenience re-exports that are NOT compatibility layers
        const rel = relative(join(__dirname, ".."), file);
        const allowlist = [
          "src/lib/calculator.ts",
          "src/core/search/types.ts",
          "src/core/use-cases/ToolCommand.ts",
          "src/lib/operator/loaders/analytics-loaders.ts",
        ];
        if (!allowlist.includes(rel)) {
          unannotated.push(rel);
        }
      }
    }

    expect(unannotated).toEqual([]);
  });

  it("deprecated symbols are not imported by non-test source files", () => {
    const srcFiles = collectTsFiles(SRC_ROOT);
    const violations: string[] = [];

    // Collect all @deprecated symbol names from src/
    const deprecatedSymbols: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("@deprecated")) {
          // Look at the next few lines for an export declaration
          for (let j = i; j < Math.min(lines.length, i + 3); j++) {
            const exportMatch = lines[j].match(
              /export\s+(?:async\s+)?function\s+(\w+)/,
            );
            if (exportMatch) {
              deprecatedSymbols.push(exportMatch[1]);
              break;
            }
            const reExportMatch = lines[j].match(
              /export\s+\{[^}]*?\b(\w+)\b[^}]*\}/,
            );
            if (reExportMatch) {
              deprecatedSymbols.push(reExportMatch[1]);
              break;
            }
          }
        }
      }
    }

    // If no deprecated symbols, this test passes trivially (all were removed)
    if (deprecatedSymbols.length === 0) return;

    // Check that no non-test src file imports them
    for (const file of srcFiles) {
      const content = readFileSync(file, "utf-8");
      for (const sym of deprecatedSymbols) {
        if (content.includes(`import`) && content.includes(sym)) {
          // Check it's an actual import, not the definition
          const importPattern = new RegExp(
            `import\\s+\\{[^}]*\\b${sym}\\b[^}]*\\}\\s+from`,
          );
          if (importPattern.test(content) && !content.includes(`@deprecated`)) {
            const rel = relative(join(__dirname, ".."), file);
            violations.push(`${rel} imports deprecated symbol ${sym}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
