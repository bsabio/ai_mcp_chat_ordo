import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { SHELL_ROUTES, type ShellRouteDefinition } from "@/lib/shell/shell-navigation";

interface ListAvailablePagesOutput {
  routes: Array<{ label: string; href: string; description: string | undefined }>;
}

function isVisibleToRole(route: ShellRouteDefinition, role: string): boolean {
  const vis = route.accountVisibility ?? route.headerVisibility ?? "all";
  if (vis === "all") return true;
  return (vis as readonly string[]).includes(role);
}

export function parseListAvailablePagesInput(value: unknown): Record<string, never> {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("list_available_pages input must be an object.");
  }

  return {};
}

export async function executeListAvailablePages(
  _input: Record<string, never>,
  context?: ToolExecutionContext,
): Promise<ListAvailablePagesOutput> {
  const role = context?.role ?? "ANONYMOUS";
  const routes = SHELL_ROUTES
    .filter((route) => route.kind === "internal" && isVisibleToRole(route, role))
    .map((route) => ({ label: route.label, href: route.href, description: route.description }));

  return { routes };
}

export const listAvailablePagesTool = buildCatalogBoundToolDescriptor(
  CAPABILITY_CATALOG.list_available_pages,
  {
    parse: parseListAvailablePagesInput,
    execute: (input, context) => executeListAvailablePages(input, context),
  },
);
