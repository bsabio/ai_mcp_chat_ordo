import type { RoleName } from "@/core/entities/user";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";

export interface RuntimeToolManifestEntry {
  name: string;
  description: string;
  category: string;
}

export const RUNTIME_MANIFEST_ROLE_ORDER: readonly RoleName[] = [
  "ANONYMOUS",
  "AUTHENTICATED",
  "APPRENTICE",
  "STAFF",
  "ADMIN",
];

export function getRuntimeToolManifestForRole(
  registry: ToolRegistry,
  role: RoleName,
  options?: { allowedToolNames?: readonly string[] },
): RuntimeToolManifestEntry[] {
  const allowedToolNames = options?.allowedToolNames
    ? new Set(options.allowedToolNames)
    : null;

  return registry.getSchemasForRole(role)
    .filter((schema) => !allowedToolNames || allowedToolNames.has(schema.name))
    .map((schema) => ({
      name: schema.name,
      description: schema.description,
      category: registry.getDescriptor(schema.name)?.category ?? "uncategorized",
    }));
}

export function getRuntimeToolCountsByRole(registry: ToolRegistry): Record<RoleName, number> {
  return RUNTIME_MANIFEST_ROLE_ORDER.reduce<Record<RoleName, number>>((counts, role) => {
    counts[role] = getRuntimeToolManifestForRole(registry, role).length;
    return counts;
  }, {
    ANONYMOUS: 0,
    AUTHENTICATED: 0,
    APPRENTICE: 0,
    STAFF: 0,
    ADMIN: 0,
  });
}