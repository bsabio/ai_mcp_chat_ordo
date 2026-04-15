/**
 * Sprint 9 — Data Access Canary Test
 *
 * Ensures no new `getDb()` callers are added for DataMapper construction
 * outside of approved files. Raw SQL callers are documented exceptions.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

/**
 * Files that are approved to import getDb() directly:
 * - db/index.ts: the definition itself
 * - RepositoryFactory.ts: the canonical factory
 * - conversation-root.ts: intentional request-scoped grouping (Sprint 6)
 *
 * Raw SQL callers: these use getDb() for direct SQL queries, not DataMapper
 * construction. They are documented and accepted until repository methods
 * replace the raw queries.
 */
const APPROVED_GETDB_PATTERNS = [
  // Raw SQL route handlers
  "affiliates/[userId]/route.ts",
  "routing-review/route.ts",
  "qr/[code]/route.ts",
  // Raw SQL lib modules
  "admin-attribution.ts",
  "admin-leads.ts",
  "admin-search.ts",
  "auth.ts",
  "embed-conversation.ts",
  "resolve-user.ts",
  "search-pipeline.ts",
  // Intentional request-scoped grouping
  "conversation-root.ts",
  // Operator helpers
  "operator-loader-helpers.ts",
  "admin-review-loaders.ts",
  // Prompt control plane (raw SQL + DataMapper mix)
  "prompt-control-plane-service.ts",
  // Referral modules (default parameter pattern + raw SQL)
  "admin-referral-analytics.ts",
  "referral-analytics.ts",
  "referral-ledger.ts",
  "referral-resolver.ts",
];

function isApproved(filePath: string): boolean {
  return APPROVED_GETDB_PATTERNS.some((pattern) => filePath.includes(pattern));
}

describe("Sprint 9 — Data Access Canary", () => {
  it("no DataMapper construction with getDb() outside RepositoryFactory", () => {
    let output: string;
    try {
      output = execSync(
        `grep -rn "new.*DataMapper(getDb\\|new.*VectorStore(getDb" src/ --include="*.ts"`,
        { encoding: "utf-8", cwd: process.cwd() },
      ).trim();
    } catch {
      // grep exit 1 = no matches = perfect
      return;
    }

    const violations = output
      .split("\n")
      .filter((line) => line.length > 0)
      .filter((line) => !line.includes(".test."))
      .filter((line) => !line.includes("RepositoryFactory"))
      .filter((line) => !line.includes("evals/workspace.ts"))
      .filter((line) => !line.includes("conversation-root.ts"));

    expect(violations).toEqual([]);
  });

  it("getDb() callers are only in approved files", () => {
    let output: string;
    try {
      output = execSync(
        `grep -rn "getDb()" src/ --include="*.ts"`,
        { encoding: "utf-8", cwd: process.cwd() },
      ).trim();
    } catch {
      return; // No matches = perfect
    }

    const callerPaths = output
      .split("\n")
      .map((line) => line.split(":")[0])
      .filter((path) => !path.includes(".test."))
      .filter((path) => !path.includes("db/index.ts"))
      .filter((path) => !path.includes("RepositoryFactory.ts"))
      .filter((path, index, arr) => arr.indexOf(path) === index);

    const unapproved = callerPaths.filter((path) => !isApproved(path));

    expect(unapproved).toEqual([]);
  });
});
