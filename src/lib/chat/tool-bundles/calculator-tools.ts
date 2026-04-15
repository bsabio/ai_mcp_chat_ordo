import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface CalculatorToolRegistrationDeps {}

const CALCULATOR_TOOL_REGISTRATIONS = [
  {
    toolName: "calculator",
    createTool: () => projectCatalogBoundToolDescriptor("calculator"),
  },
] as const satisfies readonly ToolBundleRegistration<
  "calculator",
  CalculatorToolRegistrationDeps
>[];

export const CALCULATOR_BUNDLE = createRegisteredToolBundle(
  "calculator",
  "Calculator Tools",
  CALCULATOR_TOOL_REGISTRATIONS,
);

export function registerCalculatorTools(registry: ToolRegistry): void {
  registerToolBundle(registry, CALCULATOR_TOOL_REGISTRATIONS, {});
}
