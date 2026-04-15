import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface AdminToolRegistrationDeps {}

const ADMIN_TOOL_REGISTRATIONS = [
  {
    toolName: "admin_prioritize_leads",
    createTool: () => projectCatalogBoundToolDescriptor("admin_prioritize_leads"),
  },
  {
    toolName: "admin_prioritize_offer",
    createTool: () => projectCatalogBoundToolDescriptor("admin_prioritize_offer"),
  },
  {
    toolName: "admin_triage_routing_risk",
    createTool: () => projectCatalogBoundToolDescriptor("admin_triage_routing_risk"),
  },
  {
    toolName: "admin_web_search",
    createTool: () => projectCatalogBoundToolDescriptor("admin_web_search"),
  },
] as const satisfies readonly ToolBundleRegistration<
  | "admin_prioritize_leads"
  | "admin_prioritize_offer"
  | "admin_triage_routing_risk"
  | "admin_web_search",
  AdminToolRegistrationDeps
>[];

export const ADMIN_BUNDLE = createRegisteredToolBundle(
  "admin",
  "Admin Tools",
  ADMIN_TOOL_REGISTRATIONS,
);

export function registerAdminTools(registry: ToolRegistry): void {
  registerToolBundle(registry, ADMIN_TOOL_REGISTRATIONS, {});
}
