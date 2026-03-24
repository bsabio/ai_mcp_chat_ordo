import { describe, expect, it } from "vitest";

import { generateChartTool } from "./generate-chart.tool";
import { generateGraphTool } from "./generate-graph.tool";

function hasTopLevelCombinator(schema: Record<string, unknown>): boolean {
  return "anyOf" in schema || "oneOf" in schema || "allOf" in schema;
}

describe("tool schema compatibility", () => {
  it("keeps generate_chart anthropic-compatible at the top level", () => {
    expect(hasTopLevelCombinator(generateChartTool.schema.input_schema as Record<string, unknown>)).toBe(false);
  });

  it("keeps generate_graph anthropic-compatible at the top level", () => {
    expect(hasTopLevelCombinator(generateGraphTool.schema.input_schema as Record<string, unknown>)).toBe(false);
  });
});