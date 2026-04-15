/**
 * Sprint 20 — Catalog Schema Projection Functions
 *
 * Derives Anthropic-compatible and MCP-compatible tool schemas from the
 * capability catalog's schema facet, eliminating parallel maintenance of
 * tool input schemas across different protocol surfaces.
 */

import type { CapabilityDefinition, CapabilitySchemaFacet } from "./capability-definition";
import { CAPABILITY_CATALOG } from "./catalog";

// ---------------------------------------------------------------------------
// Anthropic-compatible tool descriptor
// ---------------------------------------------------------------------------

export interface AnthropicToolDescriptor {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Project a catalog definition into an Anthropic-compatible tool descriptor.
 */
export function projectAnthropicSchema(
  def: CapabilityDefinition,
): AnthropicToolDescriptor {
  return {
    name: def.core.name,
    description: def.core.description,
    input_schema: { ...def.schema.inputSchema },
  };
}

// ---------------------------------------------------------------------------
// MCP-compatible tool schema
// ---------------------------------------------------------------------------

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Project a catalog definition into an MCP-compatible tool schema.
 *
 * Note: MCP uses `inputSchema` (camelCase) while Anthropic uses
 * `input_schema` (snake_case). This projection handles the mapping.
 */
export function projectMcpSchema(
  def: CapabilityDefinition,
): McpToolSchema {
  return {
    name: def.core.name,
    description: def.core.description,
    inputSchema: { ...def.schema.inputSchema },
  };
}

// ---------------------------------------------------------------------------
// Batch projections
// ---------------------------------------------------------------------------

/**
 * Project all catalog entries into Anthropic tool descriptors.
 */
export function getAllAnthropicSchemas(): AnthropicToolDescriptor[] {
  return (Object.values(CAPABILITY_CATALOG) as CapabilityDefinition[]).map((def) =>
    projectAnthropicSchema(def),
  );
}

/**
 * Project all catalog entries into MCP tool schemas.
 */
export function getAllMcpSchemas(): McpToolSchema[] {
  return (Object.values(CAPABILITY_CATALOG) as CapabilityDefinition[]).map((def) =>
    projectMcpSchema(def),
  );
}

/**
 * Get all catalog entries with their required schema facets.
 */
export function getSchemaEnrichedEntries(): Array<{
  name: string;
  schema: CapabilitySchemaFacet;
}> {
  return (Object.values(CAPABILITY_CATALOG) as CapabilityDefinition[])
    .map((def) => ({
      name: def.core.name,
      schema: def.schema,
    }));
}
