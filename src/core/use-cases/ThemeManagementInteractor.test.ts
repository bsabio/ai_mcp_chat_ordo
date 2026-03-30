import { describe, it, expect } from "vitest";
import {
  APPROVED_THEME_CONTROL_AXIS_IDS,
  SUPPORTED_THEME_IDS,
} from "@/lib/theme/theme-manifest";
import { ThemeManagementInteractor } from "./ThemeManagementInteractor";

describe("ThemeManagementInteractor", () => {
  it("should validate valid themes", () => {
    const interactor = new ThemeManagementInteractor();
    for (const themeId of SUPPORTED_THEME_IDS) {
      expect(interactor.validateTheme(themeId)).toBe(true);
    }
    expect(interactor.validateTheme("invalid")).toBe(false);
  });

  it("should return metadata for a theme", () => {
    const interactor = new ThemeManagementInteractor();
    const meta = interactor.getThemeMetadata("bauhaus");
    expect(meta.name).toBe("Bauhaus");
    expect(meta.primaryAttributes).toContain("Geometry");
    expect(meta.motionIntent).toBe("restrained");
    expect(meta.approvedControlAxes).toEqual(APPROVED_THEME_CONTROL_AXIS_IDS);
    expect(meta.tokenGroups.map((group) => group.id)).toEqual([
      "surface",
      "accent",
      "geometry",
      "depth",
    ]);
  });

  it("should return all themes", () => {
    const interactor = new ThemeManagementInteractor();
    const themes = interactor.getAllThemes();
    expect(themes).toHaveLength(SUPPORTED_THEME_IDS.length);
    expect(themes.map((theme) => theme.id)).toEqual(SUPPORTED_THEME_IDS);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(SUPPORTED_THEME_IDS.length);
    expect(themes.every((theme) => theme.accessibilityCompatibility.supportsDarkMode)).toBe(true);
  });
});
