import { describe, expect, it } from "vitest";

import {
  ACCESSIBILITY_DEFAULTS,
  getThemeDocumentState,
  mergeThemeStateSnapshots,
  parseThemeStateFromCookies,
  parseThemeStateFromPreferences,
  themeStateToPreferenceEntries,
} from "./theme-state";

describe("theme-state", () => {
  it("parses extended accessibility axes from stored preferences", () => {
    const parsed = parseThemeStateFromPreferences([
      { key: "theme", value: "bauhaus" },
      { key: "dark_mode", value: "true" },
      { key: "font_size", value: "lg" },
      { key: "line_height", value: "relaxed" },
      { key: "letter_spacing", value: "tight" },
      { key: "density", value: "compact" },
      { key: "color_blind_mode", value: "tritanopia" },
    ]);
    const snapshot = mergeThemeStateSnapshots(parsed);

    expect(snapshot.theme).toBe("bauhaus");
    expect(snapshot.isDark).toBe(true);
    expect(snapshot.accessibility).toEqual({
      fontSize: "lg",
      lineHeight: "relaxed",
      letterSpacing: "tight",
      density: "compact",
      colorBlindMode: "tritanopia",
    });
  });

  it("ignores invalid cookie values while keeping valid ones", () => {
    const parsed = parseThemeStateFromCookies({
      theme: "fluid",
      dark: "true",
      fontSize: "md",
      lineHeight: "chaotic",
      letterSpacing: "normal",
      density: "dense",
      colorBlindMode: "deuteranopia",
    });
    const snapshot = mergeThemeStateSnapshots(parsed);

    expect(snapshot.theme).toBe("fluid");
    expect(snapshot.isDark).toBe(true);
    expect(snapshot.accessibility).toEqual({
      ...ACCESSIBILITY_DEFAULTS,
      fontSize: "md",
      letterSpacing: "normal",
      colorBlindMode: "deuteranopia",
    });
  });

  it("returns stable HTML document attributes for server bootstrap", () => {
    const snapshot = mergeThemeStateSnapshots({
      theme: "swiss",
      isDark: true,
      accessibility: {
        fontSize: "xl",
        lineHeight: "relaxed",
        letterSpacing: "tight",
        density: "compact",
        colorBlindMode: "protanopia",
      },
    });

    const documentState = getThemeDocumentState(snapshot);

    expect(documentState.className).toBe("dark theme-swiss");
    expect(documentState.attributes).toMatchObject({
      "data-theme": "swiss",
      "data-theme-mode": "dark",
      "data-density": "compact",
      "data-color-blind": "protanopia",
    });
    expect(documentState.style).toMatchObject({
      "--font-size-base": "1.25rem",
      "--line-height-base": "1.9",
      "--letter-spacing-base": "-0.01em",
    });
  });

  it("serializes the persisted theme state keys in a stable order", () => {
    const entries = themeStateToPreferenceEntries(
      mergeThemeStateSnapshots({
        theme: "skeuomorphic",
        isDark: false,
        accessibility: {
          fontSize: "sm",
          lineHeight: "tight",
          letterSpacing: "relaxed",
          density: "relaxed",
          colorBlindMode: "none",
        },
      }),
    );

    expect(entries.map((entry) => entry.key)).toEqual([
      "theme",
      "dark_mode",
      "density",
      "font_size",
      "line_height",
      "letter_spacing",
      "color_blind_mode",
    ]);
  });
});