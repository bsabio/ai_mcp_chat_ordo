"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  prefersDarkColorScheme,
  supportsReducedMotion,
  supportsViewTransitions,
} from "@/lib/ui/browserSupport";

export type { Theme } from "@/core/entities/theme";
import type { Theme } from "@/core/entities/theme";

export type FontSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpacingLevel = "tight" | "normal" | "relaxed";

export type Density = "compact" | "normal" | "relaxed";

export type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia";

export type UIPreset = "default" | "elderly" | "compact" | "high-contrast" | "color-blind-deuteranopia" | "color-blind-protanopia" | "color-blind-tritanopia";

export interface AccessibilitySettings {
  fontSize: FontSize;
  lineHeight: SpacingLevel;
  letterSpacing: SpacingLevel;
  density: Density;
  colorBlindMode: ColorBlindMode;
}

const ACCESSIBILITY_DEFAULTS: AccessibilitySettings = {
  fontSize: "md",
  lineHeight: "normal",
  letterSpacing: "normal",
  density: "normal",
  colorBlindMode: "none",
};

export const UI_PRESETS: Record<UIPreset, Partial<AccessibilitySettings> & { dark?: boolean; theme?: Theme }> = {
  default: { fontSize: "md", lineHeight: "normal", letterSpacing: "normal", density: "normal", colorBlindMode: "none" },
  elderly: { fontSize: "xl", lineHeight: "relaxed", letterSpacing: "relaxed", density: "relaxed" },
  compact: { fontSize: "xs", lineHeight: "tight", letterSpacing: "tight", density: "compact" },
  "high-contrast": { dark: true, fontSize: "lg", lineHeight: "relaxed" },
  "color-blind-deuteranopia": { colorBlindMode: "deuteranopia" },
  "color-blind-protanopia": { colorBlindMode: "protanopia" },
  "color-blind-tritanopia": { colorBlindMode: "tritanopia" },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (settings: AccessibilitySettings) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONT_SIZE_MAP: Record<FontSize, string> = {
  xs: "0.875rem",
  sm: "0.9375rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const LINE_HEIGHT_MAP: Record<SpacingLevel, string> = {
  tight: "1.4",
  normal: "1.6",
  relaxed: "1.9",
};

const LETTER_SPACING_MAP: Record<SpacingLevel, string> = {
  tight: "-0.01em",
  normal: "0",
  relaxed: "0.05em",
};

export function ThemeProvider({
  children,
  respectSystemDarkMode = true,
}: {
  children: React.ReactNode;
  respectSystemDarkMode?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("fluid");
  const [isDark, setIsDark] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(
    ACCESSIBILITY_DEFAULTS,
  );
  const [mounted, setMounted] = useState(false);
  const transitionRef = useRef<ViewTransition | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    // Theme
    const storedTheme = localStorage.getItem("pda-theme") as Theme | null;
    if (storedTheme) setTheme(storedTheme);

    // Dark Mode
    const storedDark = localStorage.getItem("pda-dark");
    if (storedDark !== null) {
      setIsDark(storedDark === "true");
    } else if (respectSystemDarkMode && prefersDarkColorScheme()) {
      setIsDark(true);
    }

    // Accessibility
    const storedAcc = localStorage.getItem("pda-accessibility");
    if (storedAcc) {
      try {
        setAccessibility({
          ...ACCESSIBILITY_DEFAULTS,
          ...JSON.parse(storedAcc),
        });
      } catch {
        /* ignore */
      }
    }
  }, [respectSystemDarkMode]);

  // Server hydration: fetch preferences for authenticated users (server wins)
  const hydrateFromServer = useCallback(() => {
    fetch("/api/preferences")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const prefs = data.preferences ?? [];
        for (const { key, value } of prefs as Array<{ key: string; value: string }>) {
          switch (key) {
            case "theme":
              setTheme(value as Theme);
              break;
            case "dark_mode":
              setIsDark(value === "true");
              break;
            case "font_size":
              setAccessibility((a) => ({ ...a, fontSize: value as FontSize }));
              break;
            case "density":
              setAccessibility((a) => ({ ...a, density: value as Density }));
              break;
            case "color_blind_mode":
              setAccessibility((a) => ({ ...a, colorBlindMode: value as ColorBlindMode }));
              break;
          }
        }
      })
      .catch(() => {
        /* Server unavailable — localStorage values remain */
      });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    hydrateFromServer();
  }, [mounted, hydrateFromServer]);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("pda-theme", theme);
    localStorage.setItem("pda-dark", String(isDark));
    localStorage.setItem("pda-accessibility", JSON.stringify(accessibility));

    const updateState = () => {
      const root = document.documentElement;

      // Theme class
      const themes: Theme[] = [
        "fluid",
        "bauhaus",
        "swiss",
        "skeuomorphic",
      ];
      root.classList.remove(...themes.map((t) => `theme-${t}`));
      root.classList.add(`theme-${theme}`);

      // Dark mode class
      if (isDark) root.classList.add("dark");
      else root.classList.remove("dark");

      // Accessibility CSS Variables
      root.style.setProperty(
        "--font-size-base",
        FONT_SIZE_MAP[accessibility.fontSize],
      );
      root.style.setProperty(
        "--line-height-base",
        LINE_HEIGHT_MAP[accessibility.lineHeight],
      );
      root.style.setProperty(
        "--letter-spacing-base",
        LETTER_SPACING_MAP[accessibility.letterSpacing],
      );

      // Density attribute
      document.documentElement.setAttribute(
        "data-density",
        accessibility.density,
      );

      // Color-blind mode
      if (accessibility.colorBlindMode !== "none") {
        document.documentElement.setAttribute(
          "data-color-blind",
          accessibility.colorBlindMode,
        );
      } else {
        document.documentElement.removeAttribute("data-color-blind");
      }
    };

    if (
      supportsViewTransitions() &&
      !supportsReducedMotion() &&
      document.visibilityState === "visible"
    ) {
      // Skip the outgoing transition so it doesn't flash the old state
      transitionRef.current?.skipTransition();
      transitionRef.current = document.startViewTransition(updateState);
    } else {
      updateState();
    }
  }, [theme, isDark, accessibility, mounted]);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      isDark,
      setIsDark,
      accessibility,
      setAccessibility,
    }),
    [theme, isDark, accessibility],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
