import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface NavigationToolRegistrationDeps {
  readonly registry: ToolRegistry;
}

const NAVIGATION_TOOL_REGISTRATIONS = [
  {
    toolName: "admin_search",
    createTool: () => projectCatalogBoundToolDescriptor("admin_search"),
  },
  {
    toolName: "get_current_page",
    createTool: () => projectCatalogBoundToolDescriptor("get_current_page"),
  },
  {
    toolName: "inspect_runtime_context",
    createTool: ({ registry }) => projectCatalogBoundToolDescriptor("inspect_runtime_context", { registry }),
  },
  {
    toolName: "list_available_pages",
    createTool: () => projectCatalogBoundToolDescriptor("list_available_pages"),
  },
  {
    toolName: "navigate_to_page",
    createTool: () => projectCatalogBoundToolDescriptor("navigate_to_page"),
  },
] as const satisfies readonly ToolBundleRegistration<
  "admin_search"
  | "get_current_page"
  | "inspect_runtime_context"
  | "list_available_pages"
  | "navigate_to_page",
  NavigationToolRegistrationDeps
>[];

export const NAVIGATION_BUNDLE = createRegisteredToolBundle(
  "navigation",
  "Navigation Tools",
  NAVIGATION_TOOL_REGISTRATIONS,
);

export function registerNavigationTools(registry: ToolRegistry): void {
  registerToolBundle(registry, NAVIGATION_TOOL_REGISTRATIONS, { registry });
}
