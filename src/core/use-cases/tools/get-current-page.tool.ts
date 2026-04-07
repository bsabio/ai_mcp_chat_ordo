import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import {
  resolveCurrentPageDetails,
  type CurrentPageDetails,
} from "@/lib/chat/current-page-context";

interface GetCurrentPageInput {
  pathname?: string;
}

type GetCurrentPageOutput = CurrentPageDetails;

class GetCurrentPageCommand implements ToolCommand<GetCurrentPageInput, GetCurrentPageOutput> {
  async execute(
    { pathname }: GetCurrentPageInput,
    context?: ToolExecutionContext,
  ): Promise<GetCurrentPageOutput> {
    const authoritativePathname = context?.currentPageSnapshot?.pathname
      ?? context?.currentPathname
      ?? pathname;

    if (!authoritativePathname) throw new Error("pathname is required.");

    return resolveCurrentPageDetails(authoritativePathname, context?.currentPageSnapshot);
  }
}

export const getCurrentPageTool: ToolDescriptor<GetCurrentPageInput, GetCurrentPageOutput> = {
  name: "get_current_page",
  schema: {
    description: "Return authoritative information about the page the user is currently viewing, including visible page content when available.",
    input_schema: {
      type: "object",
      properties: {
        pathname: { type: "string", description: "Optional pathname override when trusted page context is unavailable." },
      },
    },
  },
  command: new GetCurrentPageCommand(),
  roles: "ALL",
  category: "ui",
};
