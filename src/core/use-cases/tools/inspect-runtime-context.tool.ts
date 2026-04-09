import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import {
  resolveCurrentPageDetails,
  type CurrentPageDetails,
} from "@/lib/chat/current-page-context";
import { getRuntimeToolManifestForRole } from "@/lib/chat/runtime-manifest";

interface InspectRuntimeContextInput {
  includeTools?: boolean;
}

interface InspectRuntimeContextOutput {
  action: "inspect_runtime_context";
  role: ToolExecutionContext["role"];
  currentPathname: string | null;
  currentPage: CurrentPageDetails | null;
  availableTools: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  toolCount: number;
}

class InspectRuntimeContextCommand implements ToolCommand<InspectRuntimeContextInput, InspectRuntimeContextOutput> {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(input: InspectRuntimeContextInput, context?: ToolExecutionContext): Promise<InspectRuntimeContextOutput> {
    const role = context?.role ?? "ANONYMOUS";
    const currentPathname = context?.currentPageSnapshot?.pathname ?? context?.currentPathname ?? null;
    const currentPage = currentPathname
      ? resolveCurrentPageDetails(currentPathname, context?.currentPageSnapshot)
      : null;
    const availableTools = input.includeTools === false
      ? []
      : getRuntimeToolManifestForRole(this.registry, role);

    return {
      action: "inspect_runtime_context",
      role,
      currentPathname,
      currentPage,
      availableTools,
      toolCount: availableTools.length,
    };
  }
}

export function createInspectRuntimeContextTool(registry: ToolRegistry): ToolDescriptor<InspectRuntimeContextInput, InspectRuntimeContextOutput> {
  return {
    name: "inspect_runtime_context",
    schema: {
      description: "Inspect the current role-scoped runtime context for truthful meta answers about available tools and the current page.",
      input_schema: {
        type: "object",
        properties: {
          includeTools: {
            type: "boolean",
            description: "Set to false to inspect current page context without returning the role-scoped tool manifest.",
          },
        },
      },
    },
    command: new InspectRuntimeContextCommand(registry),
    roles: "ALL",
    category: "system",
  };
}