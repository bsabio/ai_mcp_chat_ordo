import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { SUPPORTED_THEME_IDS } from "@/lib/theme/theme-manifest";
import { SetThemeCommand } from "./UiTools";

export interface SetThemeInput {
  theme: string;
}

const setThemeCommand = new SetThemeCommand();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSetThemeInput(value: unknown): SetThemeInput {
  if (!isRecord(value)) {
    throw new Error("set_theme input must be an object.");
  }

  if (typeof value.theme !== "string" || value.theme.length === 0) {
    throw new Error("Theme must be provided.");
  }

  if (!SUPPORTED_THEME_IDS.includes(value.theme as (typeof SUPPORTED_THEME_IDS)[number])) {
    throw new Error(`Theme "${value.theme}" is not supported.`);
  }

  return { theme: value.theme };
}

export async function executeSetTheme(
  input: SetThemeInput,
  context?: ToolExecutionContext,
): Promise<string> {
  return setThemeCommand.execute(input, context);
}

export const setThemeTool = buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.set_theme, {
  parse: parseSetThemeInput,
  execute: (input, context) => executeSetTheme(input, context),
});
