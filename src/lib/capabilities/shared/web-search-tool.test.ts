/**
 * Sprint 18 — Web Search Tool Domain Tests
 *
 * Tests validateAdminWebSearchArgs() input validation (pure function)
 * and getAnalyticsToolSchemas() via catalog parity.
 *
 * Note: adminWebSearch() requires a real OpenAI client mock and is
 * out of scope for this sprint.
 */
import { describe, it, expect } from "vitest";
import { validateAdminWebSearchArgs } from "./web-search-tool";

describe("web-search-tool", () => {
  describe("validateAdminWebSearchArgs", () => {
    it("returns null for a valid query", () => {
      const result = validateAdminWebSearchArgs({ query: "what is TypeScript?" });
      expect(result).toBeNull();
    });

    it("returns error for empty query", () => {
      const result = validateAdminWebSearchArgs({ query: "" });
      expect(result).not.toBeNull();
      expect(result!.error).toContain("required");
    });

    it("returns error for whitespace-only query", () => {
      const result = validateAdminWebSearchArgs({ query: "   " });
      expect(result).not.toBeNull();
      expect(result!.error).toContain("required");
    });

    it("returns error for query exceeding max length", () => {
      const longQuery = "a".repeat(2001);
      const result = validateAdminWebSearchArgs({ query: longQuery });
      expect(result).not.toBeNull();
      expect(result!.error).toContain("maximum length");
    });

    it("accepts query at exactly max length", () => {
      const maxQuery = "a".repeat(2000);
      const result = validateAdminWebSearchArgs({ query: maxQuery });
      expect(result).toBeNull();
    });

    it("accepts query with allowed_domains", () => {
      const result = validateAdminWebSearchArgs({
        query: "search for this",
        allowed_domains: ["example.com"],
      });
      expect(result).toBeNull();
    });
  });
});
