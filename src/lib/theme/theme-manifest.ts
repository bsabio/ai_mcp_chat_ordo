export const SUPPORTED_THEME_IDS = ["bauhaus", "swiss", "skeuomorphic", "fluid"] as const;
export type ManifestThemeId = (typeof SUPPORTED_THEME_IDS)[number];

export const SUPPORTED_FONT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export type SupportedFontSize = (typeof SUPPORTED_FONT_SIZES)[number];

export const SUPPORTED_SPACING_LEVELS = ["tight", "normal", "relaxed"] as const;
export type SupportedSpacingLevel = (typeof SUPPORTED_SPACING_LEVELS)[number];

export const SUPPORTED_DENSITY_LEVELS = ["compact", "normal", "relaxed"] as const;
export type SupportedDensityLevel = (typeof SUPPORTED_DENSITY_LEVELS)[number];

export const SUPPORTED_COLOR_BLIND_MODES = ["none", "deuteranopia", "protanopia", "tritanopia"] as const;
export type SupportedColorBlindMode = (typeof SUPPORTED_COLOR_BLIND_MODES)[number];

export const SUPPORTED_UI_PRESET_IDS = [
  "default",
  "elderly",
  "compact",
  "high-contrast",
  "color-blind-deuteranopia",
  "color-blind-protanopia",
  "color-blind-tritanopia",
] as const;
export type SupportedUiPresetId = (typeof SUPPORTED_UI_PRESET_IDS)[number];

export const APPROVED_THEME_CONTROL_AXIS_IDS = [
  "theme",
  "dark_mode",
  "density",
  "font_size",
  "line_height",
  "letter_spacing",
  "color_blind_mode",
  "preset",
] as const;
export type ApprovedThemeControlAxisId = (typeof APPROVED_THEME_CONTROL_AXIS_IDS)[number];

export type ThemeMotionIntent = "minimal" | "restrained" | "expressive";
export type ThemeShadowIntent = "none" | "editorial" | "tactile" | "layered";

export interface ThemeTokenGroup {
  id: "surface" | "accent" | "geometry" | "depth";
  label: string;
  tokens: readonly string[];
}

export interface ThemeAccessibilityCompatibility {
  supportsDarkMode: true;
  supportedDensityModes: readonly SupportedDensityLevel[];
  supportedFontSizes: readonly SupportedFontSize[];
  supportedLineHeights: readonly SupportedSpacingLevel[];
  supportedLetterSpacing: readonly SupportedSpacingLevel[];
  supportedColorBlindModes: readonly SupportedColorBlindMode[];
  supportedPresetIds: readonly SupportedUiPresetId[];
}

export interface ThemeDensityDefaults {
  standard: SupportedDensityLevel;
  dataDense: SupportedDensityLevel;
  touch: SupportedDensityLevel;
}

export interface ThemeControlAxis {
  id: ApprovedThemeControlAxisId;
  label: string;
  options: readonly unknown[];
  defaultValue: unknown;
  mutationTools: readonly string[];
}

export interface ThemeProfile {
  id: ManifestThemeId;
  selectorLabel: string;
  name: string;
  description: string;
  yearRange: string;
  primaryAttributes: readonly string[];
  tokenGroups: readonly ThemeTokenGroup[];
  motionIntent: ThemeMotionIntent;
  shadowIntent: ThemeShadowIntent;
  densityDefaults: ThemeDensityDefaults;
  approvedControlAxes: readonly ApprovedThemeControlAxisId[];
  accessibilityCompatibility: ThemeAccessibilityCompatibility;
}

const DEFAULT_THEME_TOKEN_GROUPS = Object.freeze([
  {
    id: "surface",
    label: "Surface color system",
    tokens: ["--background", "--foreground", "--surface", "--surface-hover", "--surface-muted", "--border", "--text"],
  },
  {
    id: "accent",
    label: "Accent and emphasis",
    tokens: ["--accent", "--accent-color", "--accent-foreground"],
  },
  {
    id: "geometry",
    label: "Geometry and edge treatment",
    tokens: ["--border-radius", "--border-width", "--border-color"],
  },
  {
    id: "depth",
    label: "Depth and elevation",
    tokens: ["--shadow-sm", "--shadow-base", "--highlight-base"],
  },
] as const satisfies readonly ThemeTokenGroup[]);

const DEFAULT_THEME_ACCESSIBILITY_COMPATIBILITY: ThemeAccessibilityCompatibility = Object.freeze({
  supportsDarkMode: true,
  supportedDensityModes: SUPPORTED_DENSITY_LEVELS,
  supportedFontSizes: SUPPORTED_FONT_SIZES,
  supportedLineHeights: SUPPORTED_SPACING_LEVELS,
  supportedLetterSpacing: SUPPORTED_SPACING_LEVELS,
  supportedColorBlindModes: SUPPORTED_COLOR_BLIND_MODES,
  supportedPresetIds: SUPPORTED_UI_PRESET_IDS,
});

const ALL_CONTROL_AXES = APPROVED_THEME_CONTROL_AXIS_IDS;

export const THEME_CONTROL_AXES = Object.freeze([
  {
    id: "theme",
    label: "Named theme selection",
    options: SUPPORTED_THEME_IDS,
    defaultValue: "fluid",
    mutationTools: ["set_theme", "adjust_ui"],
  },
  {
    id: "dark_mode",
    label: "Dark mode toggle",
    options: [true, false],
    defaultValue: "system",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "density",
    label: "Density",
    options: SUPPORTED_DENSITY_LEVELS,
    defaultValue: "normal",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "font_size",
    label: "Font size",
    options: SUPPORTED_FONT_SIZES,
    defaultValue: "md",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "line_height",
    label: "Line height",
    options: SUPPORTED_SPACING_LEVELS,
    defaultValue: "normal",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "letter_spacing",
    label: "Letter spacing",
    options: SUPPORTED_SPACING_LEVELS,
    defaultValue: "normal",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "color_blind_mode",
    label: "Color-blind mode",
    options: SUPPORTED_COLOR_BLIND_MODES,
    defaultValue: "none",
    mutationTools: ["adjust_ui"],
  },
  {
    id: "preset",
    label: "Bounded UI presets",
    options: SUPPORTED_UI_PRESET_IDS,
    defaultValue: "default",
    mutationTools: ["adjust_ui"],
  },
] as const satisfies readonly ThemeControlAxis[]);

export const THEME_MANIFEST = [
  {
    id: "bauhaus",
    selectorLabel: "Bauhaus (1919)",
    name: "Bauhaus",
    description: "Functionalism, grid-based, bold primary colors.",
    yearRange: "1919-1933",
    primaryAttributes: ["Geometry", "Primary Colors", "San-serif"],
    tokenGroups: DEFAULT_THEME_TOKEN_GROUPS,
    motionIntent: "restrained",
    shadowIntent: "editorial",
    densityDefaults: { standard: "normal", dataDense: "compact", touch: "relaxed" },
    approvedControlAxes: ALL_CONTROL_AXES,
    accessibilityCompatibility: DEFAULT_THEME_ACCESSIBILITY_COMPATIBILITY,
  },
  {
    id: "swiss",
    selectorLabel: "Swiss Grid (1950s)",
    name: "Swiss Style",
    description: "Cleanliness, readability, and objectivity.",
    yearRange: "1950s-1960s",
    primaryAttributes: ["Asymmetric Layouts", "Grid", "Sans-serif Typo"],
    tokenGroups: DEFAULT_THEME_TOKEN_GROUPS,
    motionIntent: "minimal",
    shadowIntent: "none",
    densityDefaults: { standard: "normal", dataDense: "compact", touch: "relaxed" },
    approvedControlAxes: ALL_CONTROL_AXES,
    accessibilityCompatibility: DEFAULT_THEME_ACCESSIBILITY_COMPATIBILITY,
  },
  {
    id: "skeuomorphic",
    selectorLabel: "Skeuomorphic (2000s)",
    name: "Skeuomorphism",
    description: "Realistic textures and depth.",
    yearRange: "2000s-2010s",
    primaryAttributes: ["Bevels", "Gradients", "Textures"],
    tokenGroups: DEFAULT_THEME_TOKEN_GROUPS,
    motionIntent: "restrained",
    shadowIntent: "tactile",
    densityDefaults: { standard: "normal", dataDense: "compact", touch: "relaxed" },
    approvedControlAxes: ALL_CONTROL_AXES,
    accessibilityCompatibility: DEFAULT_THEME_ACCESSIBILITY_COMPATIBILITY,
  },
  {
    id: "fluid",
    selectorLabel: "Modern Fluid (Present)",
    name: "Fluid / Glass",
    description: "Modern, translucent, and motion-heavy.",
    yearRange: "2020s-Present",
    primaryAttributes: ["Blur", "Gradients", "Smoothing"],
    tokenGroups: DEFAULT_THEME_TOKEN_GROUPS,
    motionIntent: "expressive",
    shadowIntent: "layered",
    densityDefaults: { standard: "normal", dataDense: "compact", touch: "relaxed" },
    approvedControlAxes: ALL_CONTROL_AXES,
    accessibilityCompatibility: DEFAULT_THEME_ACCESSIBILITY_COMPATIBILITY,
  },
] as const satisfies readonly ThemeProfile[];

export type ManifestTheme = (typeof THEME_MANIFEST)[number];

export const THEME_DOCUMENT_CLASSES = Object.freeze(
  SUPPORTED_THEME_IDS.map((themeId) => `theme-${themeId}`),
) as readonly string[];

export const THEME_SELECTOR_OPTIONS = Object.freeze(
  THEME_MANIFEST.map((theme) => ({
    id: theme.id,
    label: theme.selectorLabel,
  })),
) as readonly { id: ManifestThemeId; label: string }[];

const THEME_METADATA_BY_ID: Record<ManifestThemeId, ManifestTheme> = Object.fromEntries(
  THEME_MANIFEST.map((theme) => [theme.id, theme]),
) as Record<ManifestThemeId, ManifestTheme>;

export function isSupportedTheme(value: unknown): value is ManifestThemeId {
  return typeof value === "string" && value in THEME_METADATA_BY_ID;
}

export function getSupportedTheme(value: unknown): ManifestThemeId | null {
  return isSupportedTheme(value) ? value : null;
}

export function getThemeManifest(): readonly ManifestTheme[] {
  return THEME_MANIFEST;
}

export function getThemeManifestEntry(themeId: ManifestThemeId): ManifestTheme {
  return THEME_METADATA_BY_ID[themeId];
}