import {
  SUPPORTED_COLOR_BLIND_MODES,
  SUPPORTED_DENSITY_LEVELS,
  SUPPORTED_FONT_SIZES,
  SUPPORTED_SPACING_LEVELS,
  THEME_DOCUMENT_CLASSES,
  getSupportedTheme,
} from "@/lib/theme/theme-manifest";
import type {
  ManifestThemeId,
  SupportedColorBlindMode,
  SupportedDensityLevel,
  SupportedFontSize,
  SupportedSpacingLevel,
} from "@/lib/theme/theme-manifest";

export type Theme = ManifestThemeId;
export type FontSize = SupportedFontSize;
export type SpacingLevel = SupportedSpacingLevel;
export type Density = SupportedDensityLevel;
export type ColorBlindMode = SupportedColorBlindMode;

export type UIPreset =
  | "default"
  | "elderly"
  | "compact"
  | "high-contrast"
  | "color-blind-deuteranopia"
  | "color-blind-protanopia"
  | "color-blind-tritanopia";

export interface AccessibilitySettings {
  fontSize: FontSize;
  lineHeight: SpacingLevel;
  letterSpacing: SpacingLevel;
  density: Density;
  colorBlindMode: ColorBlindMode;
}

export interface ThemeStateSnapshot {
  theme: Theme;
  isDark: boolean;
  accessibility: AccessibilitySettings;
}

export interface PartialThemeStateSnapshot {
  theme?: unknown;
  isDark?: unknown;
  accessibility?: Partial<Record<keyof AccessibilitySettings, unknown>>;
}

export interface ThemePreferenceEntry {
  key: string;
  value: string;
}

export const ACCESSIBILITY_DEFAULTS: AccessibilitySettings = Object.freeze({
  fontSize: "md",
  lineHeight: "normal",
  letterSpacing: "normal",
  density: "normal",
  colorBlindMode: "none",
});

export const DEFAULT_THEME_STATE: ThemeStateSnapshot = Object.freeze({
  theme: "fluid",
  isDark: false,
  accessibility: ACCESSIBILITY_DEFAULTS,
});

export const UI_PRESETS: Record<
  UIPreset,
  Partial<AccessibilitySettings> & { dark?: boolean; theme?: Theme }
> = Object.freeze({
  default: { fontSize: "md", lineHeight: "normal", letterSpacing: "normal", density: "normal", colorBlindMode: "none" },
  elderly: { fontSize: "xl", lineHeight: "relaxed", letterSpacing: "relaxed", density: "relaxed" },
  compact: { fontSize: "xs", lineHeight: "tight", letterSpacing: "tight", density: "compact" },
  "high-contrast": { dark: true, fontSize: "lg", lineHeight: "relaxed" },
  "color-blind-deuteranopia": { colorBlindMode: "deuteranopia" },
  "color-blind-protanopia": { colorBlindMode: "protanopia" },
  "color-blind-tritanopia": { colorBlindMode: "tritanopia" },
});

export const FONT_SIZE_MAP: Record<FontSize, string> = Object.freeze({
  xs: "0.875rem",
  sm: "0.9375rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
});

export const LINE_HEIGHT_MAP: Record<SpacingLevel, string> = Object.freeze({
  tight: "1.4",
  normal: "1.6",
  relaxed: "1.9",
});

export const LETTER_SPACING_MAP: Record<SpacingLevel, string> = Object.freeze({
  tight: "-0.01em",
  normal: "0",
  relaxed: "0.05em",
});

export const THEME_STORAGE_KEYS = Object.freeze({
  theme: "pda-theme",
  dark: "pda-dark",
  accessibility: "pda-accessibility",
});

export const THEME_COOKIE_KEYS = Object.freeze({
  theme: "pda_theme",
  dark: "pda_dark",
  fontSize: "pda_font_size",
  lineHeight: "pda_line_height",
  letterSpacing: "pda_letter_spacing",
  density: "pda_density",
  colorBlindMode: "pda_color_blind_mode",
});

export const THEME_TRANSITION_MODE = "overlay-plus-registered-tokens";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const THEME_PREFERENCE_ORDER = [
  "theme",
  "dark_mode",
  "density",
  "font_size",
  "line_height",
  "letter_spacing",
  "color_blind_mode",
] as const;

function isOneOf<TValue extends string>(
  allowed: readonly TValue[],
  value: unknown,
): value is TValue {
  return typeof value === "string" && allowed.includes(value as TValue);
}

function normalizeTheme(value: unknown, fallback: Theme): Theme {
  return getSupportedTheme(value) ?? fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeAccessibilitySettings(
  value: Partial<Record<keyof AccessibilitySettings, unknown>> | null | undefined,
  fallback: AccessibilitySettings = ACCESSIBILITY_DEFAULTS,
): AccessibilitySettings {
  const input = value ?? {};

  return {
    fontSize: isOneOf(SUPPORTED_FONT_SIZES, input.fontSize)
      ? input.fontSize
      : fallback.fontSize,
    lineHeight: isOneOf(SUPPORTED_SPACING_LEVELS, input.lineHeight)
      ? input.lineHeight
      : fallback.lineHeight,
    letterSpacing: isOneOf(SUPPORTED_SPACING_LEVELS, input.letterSpacing)
      ? input.letterSpacing
      : fallback.letterSpacing,
    density: isOneOf(SUPPORTED_DENSITY_LEVELS, input.density)
      ? input.density
      : fallback.density,
    colorBlindMode: isOneOf(SUPPORTED_COLOR_BLIND_MODES, input.colorBlindMode)
      ? input.colorBlindMode
      : fallback.colorBlindMode,
  };
}

export function parseStoredAccessibilitySettings(
  rawValue: string | null,
): Partial<Record<keyof AccessibilitySettings, unknown>> | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as Partial<Record<keyof AccessibilitySettings, unknown>>;
  } catch {
    return null;
  }
}

export function buildThemeState(
  fallback: ThemeStateSnapshot = DEFAULT_THEME_STATE,
  overrides: PartialThemeStateSnapshot | null | undefined = {},
): ThemeStateSnapshot {
  return {
    theme: normalizeTheme(overrides?.theme, fallback.theme),
    isDark: normalizeBoolean(overrides?.isDark, fallback.isDark),
    accessibility: normalizeAccessibilitySettings(
      overrides?.accessibility,
      fallback.accessibility,
    ),
  };
}

export function mergeThemeStateSnapshots(
  ...overrides: Array<PartialThemeStateSnapshot | null | undefined>
): ThemeStateSnapshot {
  return overrides.reduce<ThemeStateSnapshot>(
    (current, override) => buildThemeState(current, override),
    DEFAULT_THEME_STATE,
  );
}

export function parseThemeStateFromPreferences(
  preferences: readonly ThemePreferenceEntry[],
): PartialThemeStateSnapshot {
  const accessibility: Partial<Record<keyof AccessibilitySettings, unknown>> = {};
  const overrides: PartialThemeStateSnapshot = { accessibility };

  for (const { key, value } of preferences) {
    switch (key) {
      case "theme":
        if (getSupportedTheme(value)) {
          overrides.theme = value;
        }
        break;
      case "dark_mode":
        if (value === "true" || value === "false") {
          overrides.isDark = value === "true";
        }
        break;
      case "font_size":
        accessibility.fontSize = value;
        break;
      case "line_height":
        accessibility.lineHeight = value;
        break;
      case "letter_spacing":
        accessibility.letterSpacing = value;
        break;
      case "density":
        accessibility.density = value;
        break;
      case "color_blind_mode":
        accessibility.colorBlindMode = value;
        break;
      default:
        break;
    }
  }

  return Object.keys(accessibility).length > 0
    ? overrides
    : { ...overrides, accessibility: undefined };
}

export function parseThemeStateFromCookies(cookieValues: {
  theme?: string;
  dark?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  density?: string;
  colorBlindMode?: string;
}): PartialThemeStateSnapshot {
  return {
    theme: cookieValues.theme,
    isDark:
      cookieValues.dark === "true"
        ? true
        : cookieValues.dark === "false"
          ? false
          : undefined,
    accessibility: {
      fontSize: cookieValues.fontSize,
      lineHeight: cookieValues.lineHeight,
      letterSpacing: cookieValues.letterSpacing,
      density: cookieValues.density,
      colorBlindMode: cookieValues.colorBlindMode,
    },
  };
}

export function themeStateToPreferenceEntries(
  snapshot: ThemeStateSnapshot,
): ThemePreferenceEntry[] {
  const values: Record<(typeof THEME_PREFERENCE_ORDER)[number], string> = {
    theme: snapshot.theme,
    dark_mode: String(snapshot.isDark),
    density: snapshot.accessibility.density,
    font_size: snapshot.accessibility.fontSize,
    line_height: snapshot.accessibility.lineHeight,
    letter_spacing: snapshot.accessibility.letterSpacing,
    color_blind_mode: snapshot.accessibility.colorBlindMode,
  };

  return THEME_PREFERENCE_ORDER.map((key) => ({ key, value: values[key] }));
}

export function themeStateToCookieAssignments(
  snapshot: ThemeStateSnapshot,
  options: { secure?: boolean; maxAge?: number } = {},
): string[] {
  const secure = options.secure ? "; Secure" : "";
  const maxAge = options.maxAge ?? THEME_COOKIE_MAX_AGE_SECONDS;
  const cookiePrefix = `; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;

  return [
    `${THEME_COOKIE_KEYS.theme}=${encodeURIComponent(snapshot.theme)}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.dark}=${String(snapshot.isDark)}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.fontSize}=${snapshot.accessibility.fontSize}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.lineHeight}=${snapshot.accessibility.lineHeight}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.letterSpacing}=${snapshot.accessibility.letterSpacing}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.density}=${snapshot.accessibility.density}${cookiePrefix}`,
    `${THEME_COOKIE_KEYS.colorBlindMode}=${snapshot.accessibility.colorBlindMode}${cookiePrefix}`,
  ];
}

export function getThemeDocumentState(snapshot: ThemeStateSnapshot): {
  className: string;
  attributes: Record<string, string>;
  style: Record<string, string>;
} {
  const attributes: Record<string, string> = {
    "data-theme": snapshot.theme,
    "data-theme-mode": snapshot.isDark ? "dark" : "light",
    "data-theme-transition": THEME_TRANSITION_MODE,
    "data-density": snapshot.accessibility.density,
  };

  if (snapshot.accessibility.colorBlindMode !== "none") {
    attributes["data-color-blind"] = snapshot.accessibility.colorBlindMode;
  }

  return {
    className: `${snapshot.isDark ? "dark " : ""}theme-${snapshot.theme}`.trim(),
    attributes,
    style: {
      "--font-size-base": FONT_SIZE_MAP[snapshot.accessibility.fontSize],
      "--line-height-base": LINE_HEIGHT_MAP[snapshot.accessibility.lineHeight],
      "--letter-spacing-base": LETTER_SPACING_MAP[snapshot.accessibility.letterSpacing],
    },
  };
}

export function applyThemeStateToDocument(
  root: HTMLElement,
  snapshot: ThemeStateSnapshot,
): void {
  const documentState = getThemeDocumentState(snapshot);

  root.classList.remove(...THEME_DOCUMENT_CLASSES);
  root.classList.toggle("dark", snapshot.isDark);
  root.classList.add(`theme-${snapshot.theme}`);

  for (const [attribute, value] of Object.entries(documentState.attributes)) {
    root.setAttribute(attribute, value);
  }

  for (const [property, value] of Object.entries(documentState.style)) {
    root.style.setProperty(property, value);
  }

  if (snapshot.accessibility.colorBlindMode === "none") {
    root.removeAttribute("data-color-blind");
  }
}

export function buildThemeBootstrapScript(
  options: { respectSystemDarkMode: boolean },
): string {
  const serializedFontSizeMap = JSON.stringify(FONT_SIZE_MAP);
  const serializedLineHeightMap = JSON.stringify(LINE_HEIGHT_MAP);
  const serializedLetterSpacingMap = JSON.stringify(LETTER_SPACING_MAP);

  return `(() => {
  try {
    const root = document.documentElement;
    const themeIds = ${JSON.stringify([...THEME_DOCUMENT_CLASSES].map((className) => className.replace(/^theme-/, "")))};
    const documentClasses = ${JSON.stringify([...THEME_DOCUMENT_CLASSES])};
    const fontSizes = ${JSON.stringify(SUPPORTED_FONT_SIZES)};
    const spacingLevels = ${JSON.stringify(SUPPORTED_SPACING_LEVELS)};
    const densityLevels = ${JSON.stringify(SUPPORTED_DENSITY_LEVELS)};
    const colorBlindModes = ${JSON.stringify(SUPPORTED_COLOR_BLIND_MODES)};
    const storageKeys = ${JSON.stringify(THEME_STORAGE_KEYS)};
    const defaults = ${JSON.stringify(DEFAULT_THEME_STATE)};
    const fontSizeMap = ${serializedFontSizeMap};
    const lineHeightMap = ${serializedLineHeightMap};
    const letterSpacingMap = ${serializedLetterSpacingMap};
    const isOneOf = (allowed, value) => typeof value === "string" && allowed.includes(value);

    const storedTheme = localStorage.getItem(storageKeys.theme);
    const storedDark = localStorage.getItem(storageKeys.dark);
    const rawAccessibility = localStorage.getItem(storageKeys.accessibility);

    let accessibility = {};
    if (rawAccessibility) {
      try {
        const parsed = JSON.parse(rawAccessibility);
        if (parsed && typeof parsed === "object") {
          accessibility = parsed;
        }
      } catch {
        accessibility = {};
      }
    }

    const theme = isOneOf(themeIds, storedTheme)
      ? storedTheme
      : root.getAttribute("data-theme") || defaults.theme;

    const prefersDark = ${options.respectSystemDarkMode ? "Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)" : "false"};
    const isDark = storedDark === null ? prefersDark : storedDark === "true";
    const fontSize = isOneOf(fontSizes, accessibility.fontSize)
      ? accessibility.fontSize
      : root.style.getPropertyValue("--font-size-base") ? null : defaults.accessibility.fontSize;
    const lineHeight = isOneOf(spacingLevels, accessibility.lineHeight)
      ? accessibility.lineHeight
      : defaults.accessibility.lineHeight;
    const letterSpacing = isOneOf(spacingLevels, accessibility.letterSpacing)
      ? accessibility.letterSpacing
      : defaults.accessibility.letterSpacing;
    const density = isOneOf(densityLevels, accessibility.density)
      ? accessibility.density
      : root.getAttribute("data-density") || defaults.accessibility.density;
    const colorBlindMode = isOneOf(colorBlindModes, accessibility.colorBlindMode)
      ? accessibility.colorBlindMode
      : root.getAttribute("data-color-blind") || defaults.accessibility.colorBlindMode;
    const fontSizeValue = isOneOf(fontSizes, accessibility.fontSize)
      ? fontSizeMap[accessibility.fontSize]
      : root.style.getPropertyValue("--font-size-base") || fontSizeMap[defaults.accessibility.fontSize];
    const lineHeightValue = isOneOf(spacingLevels, accessibility.lineHeight)
      ? lineHeightMap[lineHeight]
      : root.style.getPropertyValue("--line-height-base") || lineHeightMap[defaults.accessibility.lineHeight];
    const letterSpacingValue = isOneOf(spacingLevels, accessibility.letterSpacing)
      ? letterSpacingMap[letterSpacing]
      : root.style.getPropertyValue("--letter-spacing-base") || letterSpacingMap[defaults.accessibility.letterSpacing];

    root.classList.remove(...documentClasses);
    root.classList.toggle("dark", Boolean(isDark));
    root.classList.add("theme-" + theme);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-mode", isDark ? "dark" : "light");
    root.setAttribute("data-theme-transition", ${JSON.stringify(THEME_TRANSITION_MODE)});
    root.setAttribute("data-density", density);
    root.style.setProperty("--font-size-base", fontSizeValue);
    root.style.setProperty("--line-height-base", lineHeightValue);
    root.style.setProperty("--letter-spacing-base", letterSpacingValue);

    if (colorBlindMode !== "none") {
      root.setAttribute("data-color-blind", colorBlindMode);
    } else {
      root.removeAttribute("data-color-blind");
    }
  } catch {
    // Keep boot non-fatal.
  }
})();`;
}