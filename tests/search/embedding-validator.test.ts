// @vitest-environment node
import { describe, expect, it } from "vitest";
import { localEmbedder } from "@/adapters/LocalEmbedder";
import { validateEmbeddingQuality } from "@/core/search/EmbeddingValidator";

describe("EmbeddingValidator", () => {
  const embedder = localEmbedder;

  // TEST-VS-54 + TEST-VS-55: All validation pairs pass their thresholds
  it("all validation pairs pass quality thresholds", { timeout: 120_000 }, async () => {
    const result = await validateEmbeddingQuality(embedder);
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(5);
    for (const detail of result.details) {
      expect(detail).toMatch(/^PASS/);
    }
  });
});
