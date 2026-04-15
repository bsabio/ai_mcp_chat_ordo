import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";
import {
  SUPPORTED_COLOR_BLIND_MODES,
  SUPPORTED_DENSITY_LEVELS,
  SUPPORTED_FONT_SIZES,
  SUPPORTED_SPACING_LEVELS,
  SUPPORTED_THEME_IDS,
  SUPPORTED_UI_PRESET_IDS,
} from "@/lib/theme/theme-manifest";
import { AdjustUICommand } from "./UiTools";

export interface AdjustUiInput {
  preset?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  density?: string;
  dark?: boolean;
  theme?: string;
  colorBlindMode?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalEnum(
  fieldName: string,
  value: unknown,
  allowed: readonly string[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(", ")}.`);
  }

  return value;
}

export function parseAdjustUiInput(value: unknown): AdjustUiInput {
  if (!isRecord(value)) {
    throw new Error("adjust_ui input must be an object.");
  }

  const dark = value.dark;
  if (dark !== undefined && typeof dark !== "boolean") {
    throw new Error("dark must be a boolean when provided.");
  }

  return {
    preset: parseOptionalEnum("preset", value.preset, SUPPORTED_UI_PRESET_IDS),
    fontSize: parseOptionalEnum("fontSize", value.fontSize, SUPPORTED_FONT_SIZES),
    lineHeight: parseOptionalEnum("lineHeight", value.lineHeight, SUPPORTED_SPACING_LEVELS),
    letterSpacing: parseOptionalEnum("letterSpacing", value.letterSpacing, SUPPORTED_SPACING_LEVELS),
    density: parseOptionalEnum("density", value.density, SUPPORTED_DENSITY_LEVELS),
    dark,
    theme: parseOptionalEnum("theme", value.theme, SUPPORTED_THEME_IDS),
    colorBlindMode: parseOptionalEnum("colorBlindMode", value.colorBlindMode, SUPPORTED_COLOR_BLIND_MODES),
  };
}

export async function executeAdjustUi(
  repo: UserPreferencesRepository | undefined,
  input: AdjustUiInput,
  context?: ToolExecutionContext,
): Promise<string> {
  return new AdjustUICommand(repo).execute(input as Record<string, unknown>, context);
}

export function createAdjustUiTool(repo?: UserPreferencesRepository) {
  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.adjust_ui, {
    parse: parseAdjustUiInput,
    execute: (input, context) => executeAdjustUi(repo, input, context),
  });
}
