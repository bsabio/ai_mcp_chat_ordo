import { describe, expect, it } from "vitest";

import {
  APPROVED_THEME_CONTROL_AXIS_IDS,
  SUPPORTED_COLOR_BLIND_MODES,
  SUPPORTED_DENSITY_LEVELS,
  SUPPORTED_FONT_SIZES,
  SUPPORTED_SPACING_LEVELS,
  SUPPORTED_THEME_IDS,
  SUPPORTED_UI_PRESET_IDS,
  THEME_CONTROL_AXES,
  THEME_MANIFEST,
  THEME_SELECTOR_OPTIONS,
} from "./theme-manifest";

describe("theme manifest", () => {
  it("keeps selector options ordered and aligned to supported theme ids", () => {
    expect(THEME_SELECTOR_OPTIONS.map((option) => option.id)).toEqual(SUPPORTED_THEME_IDS);
  });

  it("gives every supported theme a complete profile contract", () => {
    expect(THEME_MANIFEST).toHaveLength(SUPPORTED_THEME_IDS.length);

    for (const theme of THEME_MANIFEST) {
      expect(theme.approvedControlAxes).toEqual(APPROVED_THEME_CONTROL_AXIS_IDS);
      expect(theme.tokenGroups.map((group) => group.id)).toEqual([
        "surface",
        "accent",
        "geometry",
        "depth",
      ]);
      expect(theme.accessibilityCompatibility.supportedDensityModes).toEqual(SUPPORTED_DENSITY_LEVELS);
      expect(theme.accessibilityCompatibility.supportedFontSizes).toEqual(SUPPORTED_FONT_SIZES);
      expect(theme.accessibilityCompatibility.supportedLineHeights).toEqual(SUPPORTED_SPACING_LEVELS);
      expect(theme.accessibilityCompatibility.supportedLetterSpacing).toEqual(SUPPORTED_SPACING_LEVELS);
      expect(theme.accessibilityCompatibility.supportedColorBlindModes).toEqual(SUPPORTED_COLOR_BLIND_MODES);
      expect(theme.accessibilityCompatibility.supportedPresetIds).toEqual(SUPPORTED_UI_PRESET_IDS);
    }
  });

  it("publishes the bounded runtime control axes", () => {
    expect(THEME_CONTROL_AXES.map((axis) => axis.id)).toEqual(APPROVED_THEME_CONTROL_AXIS_IDS);
    expect(THEME_CONTROL_AXES.find((axis) => axis.id === "theme")?.options).toEqual(SUPPORTED_THEME_IDS);
    expect(THEME_CONTROL_AXES.find((axis) => axis.id === "preset")?.options).toEqual(SUPPORTED_UI_PRESET_IDS);
  });
});