import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { getUserPreferencesDataMapper } from "@/adapters/RepositoryFactory";

import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface ThemeToolRegistrationDeps {
  readonly prefsRepo: ReturnType<typeof getUserPreferencesDataMapper>;
}

const THEME_TOOL_REGISTRATIONS = [
  {
    toolName: "set_theme",
    createTool: () => projectCatalogBoundToolDescriptor("set_theme"),
  },
  {
    toolName: "inspect_theme",
    createTool: () => projectCatalogBoundToolDescriptor("inspect_theme"),
  },
  {
    toolName: "adjust_ui",
    createTool: ({ prefsRepo }) => projectCatalogBoundToolDescriptor("adjust_ui", { userPreferencesRepo: prefsRepo }),
  },
  {
    toolName: "set_preference",
    createTool: ({ prefsRepo }) => projectCatalogBoundToolDescriptor("set_preference", { userPreferencesRepo: prefsRepo }),
  },
] as const satisfies readonly ToolBundleRegistration<
  "set_theme" | "inspect_theme" | "adjust_ui" | "set_preference",
  ThemeToolRegistrationDeps
>[];

export const THEME_BUNDLE: ToolBundleDescriptor = createRegisteredToolBundle(
  "theme",
  "Theme Tools",
  THEME_TOOL_REGISTRATIONS,
);

export function registerThemeTools(registry: ToolRegistry): void {
  registerToolBundle(registry, THEME_TOOL_REGISTRATIONS, {
    prefsRepo: getUserPreferencesDataMapper(),
  });
}
