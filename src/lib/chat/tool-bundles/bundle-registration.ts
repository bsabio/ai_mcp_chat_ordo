import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";

export interface ToolBundleRegistration<TToolName extends string, TDeps> {
  readonly toolName: TToolName;
  readonly createTool: (deps: TDeps) => ToolDescriptor;
}

export function createRegisteredToolBundle<TToolName extends string, TDeps>(
  id: string,
  displayName: string,
  registrations: readonly ToolBundleRegistration<TToolName, TDeps>[],
  additionalToolNames: readonly string[] = [],
): ToolBundleDescriptor {
  return {
    id,
    displayName,
    toolNames: Object.freeze([...registrations.map(({ toolName }) => toolName), ...additionalToolNames]),
  };
}

export function registerToolBundle<TToolName extends string, TDeps>(
  registry: ToolRegistry,
  registrations: readonly ToolBundleRegistration<TToolName, TDeps>[],
  deps: TDeps,
): void {
  for (const registration of registrations) {
    registry.register(registration.createTool(deps));
  }
}