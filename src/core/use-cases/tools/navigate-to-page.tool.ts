import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

interface NavigateToPageInput {
  path: string;
}

interface NavigateToPageOutput {
  path: string;
  label: string | null;
  description: string | null;
  __actions__: Array<{ type: "navigate"; path: string }>;
}

class NavigateToPageCommand implements ToolCommand<NavigateToPageInput, NavigateToPageOutput> {
  async execute({ path }: NavigateToPageInput): Promise<NavigateToPageOutput> {
    if (!path) throw new Error("path is required.");

    // Find the most specific match (longest href)
    const match = SHELL_ROUTES
      .filter((r) => r.kind === "internal" && (r.href === path || path.startsWith(r.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0];

    if (!match) {
      throw new Error(`Unknown page: ${path}. Use list_available_pages to see valid destinations.`);
    }

    return {
      path: match.href,
      label: match.label,
      description: match.description ?? null,
      __actions__: [{ type: "navigate", path: match.href }],
    };
  }
}

export const navigateToPageTool: ToolDescriptor<NavigateToPageInput, NavigateToPageOutput> = {
  name: "navigate_to_page",
  schema: {
    description: "Navigate the user to a validated page. Returns a navigation chip the UI renders.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Destination pathname, e.g. /admin/users." },
      },
      required: ["path"],
    },
  },
  command: new NavigateToPageCommand(),
  roles: "ALL",
  category: "ui",
};
