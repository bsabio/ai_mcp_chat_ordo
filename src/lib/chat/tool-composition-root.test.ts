import { describe, expect, it } from "vitest";

import { getToolComposition } from "./tool-composition-root";
import {
  getRuntimeToolCountsByRole,
  getRuntimeToolManifestForRole,
  RUNTIME_MANIFEST_ROLE_ORDER,
} from "./runtime-manifest";

describe("tool composition runtime manifest", () => {
  const { registry } = getToolComposition();

  it("removes the legacy navigate tool from model-visible role manifests", () => {
    for (const role of RUNTIME_MANIFEST_ROLE_ORDER) {
      const names = getRuntimeToolManifestForRole(registry, role).map((entry) => entry.name);
      expect(names).not.toContain("navigate");
    }
  });

  it("exposes validated navigation and runtime inspection tools for all roles", () => {
    for (const role of RUNTIME_MANIFEST_ROLE_ORDER) {
      const names = getRuntimeToolManifestForRole(registry, role).map((entry) => entry.name);
      expect(names).toContain("get_current_page");
      expect(names).toContain("inspect_runtime_context");
      expect(names).toContain("list_available_pages");
      expect(names).toContain("navigate_to_page");
    }
  });

  it("keeps role tool counts stable", () => {
    expect(getRuntimeToolCountsByRole(registry)).toEqual({
      ANONYMOUS: 10,
      AUTHENTICATED: 25,
      APPRENTICE: 25,
      STAFF: 25,
      ADMIN: 54,
    });
  });
});