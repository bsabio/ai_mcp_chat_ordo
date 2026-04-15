import { describe, expect, it } from "vitest";
import {
  projectMcpToolRegistration,
  projectMcpToolRegistrationByName,
  getAllMcpExportableTools,
} from "./mcp-export";
import { getCatalogDefinition } from "./catalog";

describe("mcp-export", () => {
  describe("projectMcpToolRegistration", () => {
    it("projects admin_web_search into an MCP registration", () => {
      const def = getCatalogDefinition("admin_web_search")!;
      const reg = projectMcpToolRegistration(def);

      expect(reg).not.toBeNull();
      expect(reg!.name).toBe("admin_web_search");
      expect(reg!.sharedModule).toBe("src/lib/capabilities/shared/web-search-tool");
      expect(reg!.category).toBe("content");
      expect(reg!.allowedRoles).toContain("ADMIN");
      expect(reg!.description).toBeTruthy();
    });

    it("projects admin_prioritize_leads into an MCP registration", () => {
      const def = getCatalogDefinition("admin_prioritize_leads")!;
      const reg = projectMcpToolRegistration(def);

      expect(reg).not.toBeNull();
      expect(reg!.name).toBe("admin_prioritize_leads");
      expect(reg!.sharedModule).toBe("src/lib/capabilities/shared/admin-intelligence-tool");
      expect(reg!.allowedRoles).toContain("ADMIN");
    });

    it("projects admin_search into an MCP registration", () => {
      const def = getCatalogDefinition("admin_search")!;
      const reg = projectMcpToolRegistration(def);

      expect(reg).not.toBeNull();
      expect(reg!.name).toBe("admin_search");
      expect(reg!.sharedModule).toBe("src/lib/capabilities/shared/admin-intelligence-tool");
      expect(reg!.allowedRoles).toContain("ADMIN");
    });

    it("returns null for non-exportable capabilities", () => {
      const def = getCatalogDefinition("draft_content")!;
      const reg = projectMcpToolRegistration(def);

      expect(reg).toBeNull();
    });

    it("returns null for capabilities without mcpExport facet", () => {
      const def = getCatalogDefinition("compose_media")!;
      const reg = projectMcpToolRegistration(def);

      expect(reg).toBeNull();
    });

    it("uses mcpDescription when available, not core description", () => {
      const def = getCatalogDefinition("admin_web_search")!;
      const reg = projectMcpToolRegistration(def);

      // mcpDescription is set in the catalog, should use it
      expect(reg!.description).toBe(
        "Core web search execution logic is shared between the app tool and the MCP export layer.",
      );
    });
  });

  describe("projectMcpToolRegistrationByName", () => {
    it("returns registration for known exportable tool", () => {
      const reg = projectMcpToolRegistrationByName("admin_web_search");
      expect(reg).not.toBeNull();
      expect(reg!.name).toBe("admin_web_search");
    });

    it("returns null for known non-exportable tool", () => {
      const reg = projectMcpToolRegistrationByName("draft_content");
      expect(reg).toBeNull();
    });

    it("returns null for unknown tool name", () => {
      const reg = projectMcpToolRegistrationByName("nonexistent_tool");
      expect(reg).toBeNull();
    });
  });

  describe("getAllMcpExportableTools", () => {
    it("returns only tools with mcpExport facet", () => {
      const tools = getAllMcpExportableTools();

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((t) => t.sharedModule.length > 0)).toBe(true);
    });

    it("includes the admin intelligence export surface", () => {
      const tools = getAllMcpExportableTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain("admin_web_search");
      expect(names).toContain("admin_prioritize_leads");
      expect(names).toContain("admin_prioritize_offer");
      expect(names).toContain("admin_search");
      expect(names).toContain("admin_triage_routing_risk");
    });

    it("does not include non-exportable tools", () => {
      const tools = getAllMcpExportableTools();
      const names = tools.map((t) => t.name);

      expect(names).not.toContain("draft_content");
      expect(names).not.toContain("publish_content");
      expect(names).not.toContain("compose_media");
    });

    it("every registration has required fields", () => {
      const tools = getAllMcpExportableTools();

      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.sharedModule).toBeTruthy();
        expect(tool.category).toBeTruthy();
        expect(tool.allowedRoles.length).toBeGreaterThan(0);
      }
    });
  });
});
