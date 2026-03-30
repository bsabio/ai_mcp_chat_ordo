import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import { getDb } from "@/lib/db";
import { setThemeTool } from "@/core/use-cases/tools/set-theme.tool";
import { createInspectThemeTool } from "@/core/use-cases/tools/inspect-theme.tool";
import { createAdjustUiTool } from "@/core/use-cases/tools/adjust-ui.tool";
import { createSetPreferenceTool } from "@/core/use-cases/tools/set-preference.tool";

export function registerThemeTools(registry: ToolRegistry): void {
  const prefsRepo = new UserPreferencesDataMapper(getDb());
  registry.register(setThemeTool);
  registry.register(createInspectThemeTool());
  registry.register(createAdjustUiTool(prefsRepo));
  registry.register(createSetPreferenceTool(prefsRepo));
}
