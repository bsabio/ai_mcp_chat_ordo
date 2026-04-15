import type { RoleName } from "@/core/entities/user";
import type { ToolDescriptor } from "./ToolDescriptor";
import type { ToolBundleDescriptor } from "./ToolBundleDescriptor";
import type { ToolExecutionContext } from "./ToolExecutionContext";
import type { ToolResultFormatter } from "./ToolResultFormatter";
import { ToolAccessDeniedError, UnknownToolError } from "./errors";

export class ToolRegistry {
  private tools = new Map<string, ToolDescriptor>();
  private toolToBundle = new Map<string, ToolBundleDescriptor>();
  private bundles: readonly ToolBundleDescriptor[] = [];

  constructor(private readonly formatter?: ToolResultFormatter) {}

  register(descriptor: ToolDescriptor): void {
    if (this.tools.has(descriptor.name)) {
      throw new Error(`Tool "${descriptor.name}" is already registered`);
    }
    this.tools.set(descriptor.name, descriptor);
  }

  getSchemasForRole(role: RoleName): { name: string; description: string; input_schema: Record<string, unknown> }[] {
    return Array.from(this.tools.values())
      .filter((descriptor) => descriptor.roles === "ALL" || (Array.isArray(descriptor.roles) && descriptor.roles.includes(role)))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((descriptor) => ({
        name: descriptor.name,
        description: descriptor.schema?.description ?? "",
        input_schema: descriptor.schema?.input_schema ?? { type: "object", properties: {} },
      }));
  }

  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const descriptor = this.tools.get(name);
    if (!descriptor) {
      throw new UnknownToolError(name);
    }

    if (!this.canExecute(name, context.role)) {
      throw new ToolAccessDeniedError(name, context.role);
    }

    const result = await descriptor.command.execute(input, context);
    return this.formatter
      ? this.formatter.format(name, result, context)
      : result;
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  getDescriptor(name: string): ToolDescriptor | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  canExecute(name: string, role: RoleName): boolean {
    const descriptor = this.tools.get(name);
    if (!descriptor) return false;
    return descriptor.roles === "ALL" || (Array.isArray(descriptor.roles) && descriptor.roles.includes(role));
  }

  setBundles(descriptors: readonly ToolBundleDescriptor[]): void {
    this.bundles = descriptors;
    this.toolToBundle.clear();
    for (const bundle of descriptors) {
      for (const toolName of bundle.toolNames) {
        this.toolToBundle.set(toolName, bundle);
      }
    }
  }

  getBundleForTool(toolName: string): ToolBundleDescriptor | undefined {
    return this.toolToBundle.get(toolName);
  }

  getBundles(): readonly ToolBundleDescriptor[] {
    return this.bundles;
  }

  expandBundleRef(ref: string): readonly string[] {
    if (!ref.startsWith("bundle:")) return [ref];
    const bundleId = ref.slice(7);
    const bundle = this.bundles.find((b) => b.id === bundleId);
    return bundle ? bundle.toolNames : [];
  }
}
