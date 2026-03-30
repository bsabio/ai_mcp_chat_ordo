"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  prefersDarkColorScheme,
  supportsReducedMotion,
  supportsViewTransitions,
} from "@/lib/ui/browserSupport";
import {
  DEFAULT_THEME_STATE,
  THEME_STORAGE_KEYS,
  applyThemeStateToDocument,
  buildThemeState,
  mergeThemeStateSnapshots,
  normalizeAccessibilitySettings,
  parseStoredAccessibilitySettings,
  parseThemeStateFromPreferences,
  themeStateToCookieAssignments,
  themeStateToPreferenceEntries,
} from "@/lib/theme/theme-state";
import { getSupportedTheme } from "@/lib/theme/theme-manifest";

export type {
  AccessibilitySettings,
  ColorBlindMode,
  Density,
  FontSize,
  SpacingLevel,
  Theme,
  ThemeStateSnapshot,
  UIPreset,
} from "@/lib/theme/theme-state";
import type {
  AccessibilitySettings,
  PartialThemeStateSnapshot,
  Theme,
  ThemeStateSnapshot,
} from "@/lib/theme/theme-state";

export { UI_PRESETS } from "@/lib/theme/theme-state";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (settings: AccessibilitySettings) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  respectSystemDarkMode = true,
  initialThemeState = DEFAULT_THEME_STATE,
}: {
  children: React.ReactNode;
  respectSystemDarkMode?: boolean;
  initialThemeState?: ThemeStateSnapshot;
}) {
  const resolvedInitialThemeState = mergeThemeStateSnapshots(initialThemeState);
  const [theme, setThemeState] = useState<Theme>(resolvedInitialThemeState.theme);
  const [isDark, setIsDarkState] = useState(resolvedInitialThemeState.isDark);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(
    resolvedInitialThemeState.accessibility,
  );
  const [mounted, setMounted] = useState(false);
  const [hydrationComplete, setHydrationComplete] = useState(false);
  const transitionRef = useRef<ViewTransition | null>(null);
  const lastServerSyncRef = useRef<string | null>(null);

  const prevTheme = useRef<Theme>(resolvedInitialThemeState.theme);
  const [transitionKey, setTransitionKey] = useState(0);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const setIsDark = useCallback((dark: boolean) => {
    setIsDarkState(dark);
  }, []);

  const setAccessibilityState = useCallback((settings: AccessibilitySettings) => {
    setAccessibility((current) => normalizeAccessibilitySettings(settings, current));
  }, []);

  const applyThemeStateOverrides = useCallback((overrides: PartialThemeStateSnapshot) => {
    const nextTheme = getSupportedTheme(overrides.theme);
    if (nextTheme) {
      setThemeState(nextTheme);
    }

    if (typeof overrides.isDark === "boolean") {
      setIsDarkState(overrides.isDark);
    }

    if (overrides.accessibility) {
      setAccessibility((current) =>
        normalizeAccessibilitySettings(overrides.accessibility, current),
      );
    }
  }, []);

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
        applyThemeStateOverrides(
          parseThemeStateFromPreferences(
            prefs as Array<{ key: string; value: string }>,
          ),
        );
      })
      .catch(() => {
        /* Server unavailable — localStorage values remain */
      });
  }, [applyThemeStateOverrides]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const storedTheme = getSupportedTheme(localStorage.getItem(THEME_STORAGE_KEYS.theme));
    const storedDark = localStorage.getItem(THEME_STORAGE_KEYS.dark);
    const storedAccessibility = parseStoredAccessibilitySettings(
      localStorage.getItem(THEME_STORAGE_KEYS.accessibility),
    );

    applyThemeStateOverrides({
      theme: storedTheme ?? undefined,
      isDark:
        storedDark === null
          ? respectSystemDarkMode && prefersDarkColorScheme()
            ? true
            : undefined
          : storedDark === "true",
      accessibility: storedAccessibility ?? undefined,
    });

    Promise.resolve(hydrateFromServer()).finally(() => {
      setHydrationComplete(true);
    });
  }, [applyThemeStateOverrides, respectSystemDarkMode, hydrateFromServer]);

  useEffect(() => {
    if (!mounted) return;

    const snapshot = buildThemeState(DEFAULT_THEME_STATE, {
      theme,
      isDark,
      accessibility,
    });

    const updateState = () => {
      applyThemeStateToDocument(document.documentElement, snapshot);
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

    // Trigger overlay animation
    if (prevTheme.current !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: drives CSS transition overlay
      setTransitionKey((key) => key + 1);
      prevTheme.current = theme;
    }
  }, [theme, isDark, accessibility, mounted]);

  useEffect(() => {
    if (!mounted || !hydrationComplete) {
      return;
    }

    const snapshot = buildThemeState(DEFAULT_THEME_STATE, {
      theme,
      isDark,
      accessibility,
    });
    const serializedAccessibility = JSON.stringify(snapshot.accessibility);

    if (typeof localStorage?.setItem === "function") {
      if (localStorage.getItem(THEME_STORAGE_KEYS.theme) !== snapshot.theme) {
        localStorage.setItem(THEME_STORAGE_KEYS.theme, snapshot.theme);
      }

      if (localStorage.getItem(THEME_STORAGE_KEYS.dark) !== String(snapshot.isDark)) {
        localStorage.setItem(THEME_STORAGE_KEYS.dark, String(snapshot.isDark));
      }

      if (localStorage.getItem(THEME_STORAGE_KEYS.accessibility) !== serializedAccessibility) {
        localStorage.setItem(
          THEME_STORAGE_KEYS.accessibility,
          serializedAccessibility,
        );
      }
    }

    const secure = typeof window !== "undefined" && window.location.protocol === "https:";
    for (const cookie of themeStateToCookieAssignments(snapshot, { secure })) {
      document.cookie = cookie;
    }

    const payload = JSON.stringify(themeStateToPreferenceEntries(snapshot));
    if (payload === lastServerSyncRef.current) {
      return;
    }

    lastServerSyncRef.current = payload;
    fetch("/api/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferences: JSON.parse(payload) }),
    })
      .then((response) => {
        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`Theme preference persistence failed with status ${response.status}`);
        }

        return response.json();
      })
      .catch(() => {
        // Keep local and cookie persistence even when the authenticated endpoint is unavailable.
      });
  }, [accessibility, hydrationComplete, isDark, mounted, theme]);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      isDark,
      setIsDark,
      accessibility,
      setAccessibility: setAccessibilityState,
    }),
    [theme, setTheme, isDark, setIsDark, accessibility, setAccessibilityState],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      {transitionKey > 0 && mounted && (
        <div
          key={transitionKey}
          data-testid="theme-transition-overlay"
          className="pointer-events-none fixed inset-0 z-9999 bg-[oklch(0.5_0_0)] animate-[theme-fade-out_350ms_ease-in-out_forwards]"
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      ...DEFAULT_THEME_STATE,
      setTheme: () => {},
      setIsDark: () => {},
      setAccessibility: () => {},
    };
  }
  return context;
}
