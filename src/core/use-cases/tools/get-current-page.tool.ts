import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

interface GetCurrentPageInput {
  pathname: string;
}

interface GetCurrentPageOutput {
  pathname: string;
  routeId: string | null;
  label: string | null;
  description: string | null;
}

class GetCurrentPageCommand implements ToolCommand<GetCurrentPageInput, GetCurrentPageOutput> {
  async execute({ pathname }: GetCurrentPageInput): Promise<GetCurrentPageOutput> {
    if (!pathname) throw new Error("pathname is required.");

    // Find the most specific match (longest href)
    const match = SHELL_ROUTES
      .filter((r) => r.kind === "internal" && (r.href === pathname || pathname.startsWith(r.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0];

    return {
      pathname,
      routeId: match?.id ?? null,
      label: match?.label ?? null,
      description: match?.description ?? null,
    };
  }
}

export const getCurrentPageTool: ToolDescriptor<GetCurrentPageInput, GetCurrentPageOutput> = {
  name: "get_current_page",
  schema: {
    description: "Return information about the page the user is currently viewing.",
    input_schema: {
      type: "object",
      properties: {
        pathname: { type: "string", description: "The current URL pathname, e.g. /admin/users." },
      },
      required: ["pathname"],
    },
  },
  command: new GetCurrentPageCommand(),
  roles: "ALL",
  category: "ui",
};
