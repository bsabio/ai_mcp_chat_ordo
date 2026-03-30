import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { adminSearchTool } from "@/core/use-cases/tools/admin-search.tool";
import { getCurrentPageTool } from "@/core/use-cases/tools/get-current-page.tool";
import { listAvailablePagesTool } from "@/core/use-cases/tools/list-available-pages.tool";
import { navigateToPageTool } from "@/core/use-cases/tools/navigate-to-page.tool";

export function registerNavigationTools(registry: ToolRegistry): void {
  registry.register(getCurrentPageTool);
  registry.register(listAvailablePagesTool);
  registry.register(navigateToPageTool);
  registry.register(adminSearchTool);
}
