import { describe, expect, it } from "vitest";

import {
  APPROVED_THEME_CONTROL_AXIS_IDS,
  SUPPORTED_THEME_IDS,
} from "@/lib/theme/theme-manifest";

import { createInspectThemeTool } from "./inspect-theme.tool";

describe("inspect theme tool", () => {
  it("returns the manifest-backed theme profile contract without mutating state", async () => {
    const tool = createInspectThemeTool();

    const result = await tool.command.execute({});

    expect(result).toMatchObject({
      action: "inspect_theme",
      supported_theme_ids: SUPPORTED_THEME_IDS,
      active_theme_state: {
        available: false,
      },
    });
    expect(result.ordered_theme_profiles.map((theme) => theme.id)).toEqual(SUPPORTED_THEME_IDS);
    expect(result.approved_control_axes.map((axis) => axis.id)).toEqual(APPROVED_THEME_CONTROL_AXIS_IDS);
  });

  it("exposes an empty read-only input schema", () => {
    const tool = createInspectThemeTool();

    expect(tool.schema.input_schema).toEqual({
      type: "object",
      properties: {},
    });
  });
});