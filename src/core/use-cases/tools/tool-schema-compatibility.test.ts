import { describe, expect, it } from "vitest";
import { SUPPORTED_THEME_IDS } from "@/lib/theme/theme-manifest";

import { generateChartTool } from "./generate-chart.tool";
import { generateGraphTool } from "./generate-graph.tool";
import { setThemeTool } from "./set-theme.tool";
import { createAdjustUiTool } from "./adjust-ui.tool";
import { createInspectThemeTool } from "./inspect-theme.tool";

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

  it("keeps set_theme aligned with the manifest-backed theme enum", () => {
    const themeSchema = (setThemeTool.schema.input_schema.properties as Record<string, unknown>).theme as {
      enum?: unknown;
    };

    expect(themeSchema.enum).toEqual(SUPPORTED_THEME_IDS);
  });

  it("keeps adjust_ui theme options aligned with the manifest-backed theme enum", () => {
    const adjustUiTool = createAdjustUiTool();
    const themeSchema = (adjustUiTool.schema.input_schema.properties as Record<string, unknown>).theme as {
      enum?: unknown;
    };

    expect(themeSchema.enum).toEqual(SUPPORTED_THEME_IDS);
  });

  it("keeps inspect_theme anthropic-compatible with a read-only empty schema", () => {
    const inspectThemeTool = createInspectThemeTool();

    expect(hasTopLevelCombinator(inspectThemeTool.schema.input_schema as Record<string, unknown>)).toBe(false);
    expect(inspectThemeTool.schema.input_schema).toEqual({
      type: "object",
      properties: {},
    });
  });
});