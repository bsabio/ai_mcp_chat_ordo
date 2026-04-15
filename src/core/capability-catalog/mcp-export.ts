/**
 * Catalog-Driven MCP Tool Registration
 *
 * Sprint 7: Projects a catalog definition's mcpExport facet into a standard
 * MCP tool schema that can be used for tool registration in MCP servers.
 *
 * Sprint 11: Updated getAllMcpExportableTools() to dynamically iterate the
 * full catalog instead of hardcoding pilot tool names.
 */

import type { CapabilityDefinition } from "./capability-definition";
import { CAPABILITY_CATALOG, getCatalogDefinition, projectMcpExportIntent } from "./catalog";

// ---------------------------------------------------------------------------
// MCP registration schema
// ---------------------------------------------------------------------------

export interface McpToolRegistration {
  /** Tool name as it appears in the MCP protocol */
  name: string;
  /** Human-readable description for the MCP tool listing */
  description: string;
  /** The shared module that contains the core execution logic */
  sharedModule: string;
  /** The capability category from the catalog */
  category: string;
  /** Roles that can use this tool, or "ALL" for unrestricted */
  allowedRoles: readonly string[] | "ALL";
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Project a catalog definition into an MCP tool registration.
 * Returns null if the capability has no mcpExport facet or is not exportable.
 */
export function projectMcpToolRegistration(
  def: CapabilityDefinition,
): McpToolRegistration | null {
  const mcpExport = projectMcpExportIntent(def);
  if (!mcpExport) return null;

  return {
    name: def.core.name,
    description: mcpExport.mcpDescription ?? def.core.description,
    sharedModule: mcpExport.sharedModule,
    category: def.core.category,
    allowedRoles: def.core.roles,
  };
}

/**
 * Project an MCP tool registration by tool name.
 * Convenience wrapper that looks up the catalog first.
 */
export function projectMcpToolRegistrationByName(
  toolName: string,
): McpToolRegistration | null {
  const def = getCatalogDefinition(toolName);
  if (!def) return null;
  return projectMcpToolRegistration(def);
}

/**
 * Get all catalog capabilities that are MCP-exportable.
 *
 * Sprint 11: Dynamically iterates the full CAPABILITY_CATALOG and filters
 * for entries with an mcpExport facet marked as exportable. This replaces
 * the previous hardcoded pilot-tool list.
 */
export function getAllMcpExportableTools(): McpToolRegistration[] {
  return Object.values(CAPABILITY_CATALOG)
    .map((def) => projectMcpToolRegistration(def))
    .filter((reg): reg is McpToolRegistration => reg !== null);
}
