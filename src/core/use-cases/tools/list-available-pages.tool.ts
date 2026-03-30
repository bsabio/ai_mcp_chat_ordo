import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { SHELL_ROUTES, type ShellRouteDefinition } from "@/lib/shell/shell-navigation";

interface ListAvailablePagesOutput {
  routes: Array<{ id: string; label: string; href: string; description: string | undefined }>;
}

function isVisibleToRole(route: ShellRouteDefinition, role: string): boolean {
  const vis = route.accountVisibility ?? route.headerVisibility ?? "all";
  if (vis === "all") return true;
  return (vis as readonly string[]).includes(role);
}

class ListAvailablePagesCommand implements ToolCommand<Record<string, never>, ListAvailablePagesOutput> {
  async execute(_input: Record<string, never>, context?: ToolExecutionContext): Promise<ListAvailablePagesOutput> {
    const role = context?.role ?? "ANONYMOUS";
    const routes = SHELL_ROUTES
      .filter((r) => r.kind === "internal" && isVisibleToRole(r, role))
      .map((r) => ({ id: r.id, label: r.label, href: r.href, description: r.description }));
    return { routes };
  }
}

export const listAvailablePagesTool: ToolDescriptor<Record<string, never>, ListAvailablePagesOutput> = {
  name: "list_available_pages",
  schema: {
    description: "List all pages the current user can access based on their role.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  command: new ListAvailablePagesCommand(),
  roles: "ALL",
  category: "ui",
};
