/**
 * Sprint 20 — Schema Derivation Verification Tests
 *
 * Verifies that catalog schema facets correctly project into both
 * Anthropic-compatible and MCP-compatible tool descriptors, and that
 * the projections match the legacy schemas maintained in tool files.
 */
import { describe, it, expect } from "vitest";
import { CAPABILITY_CATALOG } from "./catalog";
import type { CapabilityDefinition } from "./capability-definition";
import {
  projectAnthropicSchema,
  projectMcpSchema,
  getAllAnthropicSchemas,
  getAllMcpSchemas,
  getSchemaEnrichedEntries,
} from "./schema-projection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEntriesWithSchema(): Array<[string, CapabilityDefinition]> {
  return (Object.entries(CAPABILITY_CATALOG) as Array<[string, CapabilityDefinition]>)
    .map((entry) => entry);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("schema-derivation", () => {
  describe("CapabilitySchemaFacet type", () => {
    it("exists on CapabilityDefinition as a required field", () => {
      const def: CapabilityDefinition = {
        core: {
          name: "test",
          label: "Test",
          description: "Test tool",
          category: "system",
          roles: "ALL",
        },
        runtime: {},
        presentation: {
          family: "system",
          cardKind: "fallback",
          executionMode: "inline",
        },
        schema: {
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
          outputHint: "test output",
        },
      };

      expect(def.schema).toBeDefined();
      expect(def.schema.inputSchema.type).toBe("object");
      expect(def.schema.outputHint).toBe("test output");
    });
  });

  describe("catalog schema enrichment", () => {
    it("covers every catalog entry with a schema facet", () => {
      const enriched = getEntriesWithSchema();
      expect(enriched.length).toBe(Object.keys(CAPABILITY_CATALOG).length);
    });

    it("every schema facet has a valid inputSchema with type 'object'", () => {
      for (const [name, def] of getEntriesWithSchema()) {
        expect(def.schema.inputSchema.type, `${name} should have type 'object'`).toBe("object");
        expect(def.schema.inputSchema.properties, `${name} should have properties`).toBeDefined();
      }
    });

    it("every schema facet with required has it as an array", () => {
      for (const [name, def] of getEntriesWithSchema()) {
        if (def.schema.inputSchema.required !== undefined) {
          expect(
            Array.isArray(def.schema.inputSchema.required),
            `${name}.required should be an array`,
          ).toBe(true);
          expect(
            def.schema.inputSchema.required.length,
            `${name}.required should not be empty`,
          ).toBeGreaterThan(0);
        }
      }
    });

    it("schema-enriched entries include deferred tools", () => {
      const names = getEntriesWithSchema().map(([name]) => name);
      expect(names).toContain("draft_content");
      expect(names).toContain("publish_content");
    });

    it("schema-enriched entries include content tools", () => {
      const names = getEntriesWithSchema().map(([name]) => name);
      expect(names).toContain("search_corpus");
      expect(names).toContain("get_section");
    });

    it("schema-enriched entries include admin tools", () => {
      const names = getEntriesWithSchema().map(([name]) => name);
      expect(names).toContain("admin_search");
      expect(names).toContain("admin_prioritize_leads");
    });
  });

  describe("projectAnthropicSchema()", () => {
    it("derives correct Anthropic tool descriptor from catalog entry", () => {
      const def = CAPABILITY_CATALOG.admin_web_search;
      const descriptor = projectAnthropicSchema(def);

      expect(descriptor.name).toBe("admin_web_search");
      expect(descriptor.description).toContain("Search the live web");
      expect(descriptor.input_schema.type).toBe("object");
      expect(descriptor.input_schema.properties).toHaveProperty("query");
      expect(descriptor.input_schema.required).toContain("query");
    });

    it("uses snake_case input_schema key", () => {
      const def = CAPABILITY_CATALOG.search_corpus;
      const descriptor = projectAnthropicSchema(def);

      expect(descriptor).toHaveProperty("input_schema");
      expect(descriptor).not.toHaveProperty("inputSchema");
    });
  });

  describe("projectMcpSchema()", () => {
    it("derives correct MCP tool schema from catalog entry", () => {
      const def = CAPABILITY_CATALOG.admin_web_search;
      const schema = projectMcpSchema(def);

      expect(schema.name).toBe("admin_web_search");
      expect(schema.inputSchema.type).toBe("object");
      expect(schema.inputSchema.properties).toHaveProperty("query");
    });

    it("uses camelCase inputSchema key", () => {
      const def = CAPABILITY_CATALOG.navigate_to_page;
      const schema = projectMcpSchema(def);

      expect(schema).toHaveProperty("inputSchema");
      expect(schema).not.toHaveProperty("input_schema");
    });
  });

  describe("batch projections", () => {
    it("getAllAnthropicSchemas() returns one schema per catalog entry", () => {
      const schemas = getAllAnthropicSchemas();
      expect(schemas.length).toBe(Object.keys(CAPABILITY_CATALOG).length);
    });

    it("getAllMcpSchemas() returns same count as Anthropic", () => {
      const anthropic = getAllAnthropicSchemas();
      const mcp = getAllMcpSchemas();
      expect(mcp.length).toBe(anthropic.length);
    });

    it("getSchemaEnrichedEntries() returns name+schema pairs", () => {
      const entries = getSchemaEnrichedEntries();
      expect(entries.length).toBe(Object.keys(CAPABILITY_CATALOG).length);

      for (const entry of entries) {
        expect(entry.name).toBeTruthy();
        expect(entry.schema.inputSchema.type).toBe("object");
      }
    });
  });

  describe("schema parity between Anthropic and MCP projections", () => {
    it("properties match between Anthropic and MCP for each entry", () => {
      for (const [, def] of getEntriesWithSchema()) {
        const anthropic = projectAnthropicSchema(def)!;
        const mcp = projectMcpSchema(def)!;

        expect(anthropic.name).toBe(mcp.name);
        expect(anthropic.description).toBe(mcp.description);
        expect(
          JSON.stringify(anthropic.input_schema.properties),
        ).toBe(JSON.stringify(mcp.inputSchema.properties));

        if (anthropic.input_schema.required) {
          expect(anthropic.input_schema.required).toEqual(mcp.inputSchema.required);
        }
      }
    });
  });
});
