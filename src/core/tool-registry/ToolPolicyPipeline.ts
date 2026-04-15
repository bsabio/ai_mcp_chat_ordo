export interface ToolPolicy {
  readonly allow?: readonly string[];
  readonly deny?: readonly string[];
}

export interface ToolPolicyLayer {
  readonly label: ToolPolicyPrecedence;
  readonly policy: ToolPolicy | undefined;
}

export type ToolPolicyPrecedence = "global" | "role" | "agent" | "provider" | "request";

export interface BundleResolver {
  expandBundleRef(ref: string): readonly string[];
}

/**
 * Applies policy layers in order, narrowing the allowed tool set.
 * - Deny overrides allow within the same layer.
 * - Later layers can only narrow, never re-add denied tools.
 * - Bundle refs ("bundle:calculator") are expanded via the resolver.
 * - Unknown refs are silently skipped (no crash).
 * - If the result would be empty, returns the original set unchanged (safety fallback).
 */
export function applyPolicyLayers(
  availableTools: readonly string[],
  layers: readonly ToolPolicyLayer[],
  resolver: BundleResolver,
): readonly string[] {
  let allowed = new Set(availableTools);

  for (const layer of layers) {
    if (!layer.policy) continue;
    const { allow, deny } = layer.policy;

    const expandRefs = (refs: readonly string[]): string[] =>
      refs.flatMap((ref) => (ref.startsWith("bundle:") ? [...resolver.expandBundleRef(ref)] : [ref]));

    if (allow) {
      const expanded = new Set(expandRefs(allow));
      allowed = new Set([...allowed].filter((t) => expanded.has(t)));
    }

    if (deny) {
      const expanded = new Set(expandRefs(deny));
      for (const t of expanded) {
        allowed.delete(t);
      }
    }
  }

  if (allowed.size === 0) return availableTools;
  return [...allowed];
}
