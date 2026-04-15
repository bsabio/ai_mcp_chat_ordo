/**
 * Sprint 14 — End-to-End Catalog Flow Verification
 *
 * Proves that every catalog entry flows through all downstream registries:
 *   catalog entry → presentation descriptor → job capability → prompt directive
 *
 * Also verifies:
 * - Adding a new catalog entry propagates to all registries
 * - promptHint facets flow into assembled role directives
 * - Projection functions produce coherent, non-null results for all entries
 */
import { describe, it, expect } from "vitest";

import {
  CAPABILITY_CATALOG,
  projectPresentationDescriptor,
  projectJobCapability,
  projectBrowserCapability,
  projectPromptHint,
} from "@/core/capability-catalog/catalog";
import type { CapabilityDefinition } from "@/core/capability-catalog/capability-definition";
import { assembleRoleDirective } from "@/core/entities/role-directive-assembler";
import type { RoleName } from "@/core/entities/user";

const ALL_ROLES: RoleName[] = [
  "ANONYMOUS",
  "AUTHENTICATED",
  "APPRENTICE",
  "STAFF",
  "ADMIN",
];

const catalogEntries = Object.entries(CAPABILITY_CATALOG);

describe("Sprint 14 — End-to-End Catalog Flow", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Full pipeline: every catalog entry → all projections
  // ─────────────────────────────────────────────────────────────────────────
  describe("Full pipeline projection", () => {
    it("every catalog entry produces a valid presentation descriptor", () => {
      for (const [name, def] of catalogEntries) {
        const desc = projectPresentationDescriptor(def);
        expect(desc, `Missing presentation for ${name}`).toBeDefined();
        expect(desc.toolName).toBe(name);
        expect(desc.family).toBeTruthy();
        expect(desc.cardKind).toBeTruthy();
      }
    });

    it("deferred entries produce valid job capabilities", () => {
      const deferredEntries = catalogEntries.filter(
        ([, def]) => (def as CapabilityDefinition).job !== undefined,
      );
      expect(deferredEntries.length).toBeGreaterThan(0);

      for (const [name, def] of deferredEntries) {
        const job = projectJobCapability(def);
        expect(job, `Missing job for deferred entry ${name}`).not.toBeNull();
        expect(job!.toolName).toBe(name);
        expect(job!.family).toBeTruthy();
        expect(job!.executionPrincipal).toBeTruthy();
      }
    });

    it("non-deferred entries produce null job capabilities", () => {
      const inlineEntries = catalogEntries.filter(
        ([, def]) => (def as CapabilityDefinition).job === undefined,
      );
      for (const [name, def] of inlineEntries) {
        const job = projectJobCapability(def);
        expect(job, `Non-null job for inline entry ${name}`).toBeNull();
      }
    });

    it("browser entries produce valid browser capabilities", () => {
      const browserEntries = catalogEntries.filter(
        ([, def]) => (def as CapabilityDefinition).browser !== undefined,
      );
      expect(browserEntries.length).toBeGreaterThan(0);

      for (const [name, def] of browserEntries) {
        const browser = projectBrowserCapability(def);
        expect(
          browser,
          `Missing browser for browser entry ${name}`,
        ).not.toBeNull();
        expect(browser!.capabilityId).toBe(name);
      }
    });

    it("promptHint entries produce role-specific directive lines", () => {
      const hintEntries = catalogEntries.filter(
        ([, def]) =>
          (def as { promptHint?: unknown }).promptHint !== undefined,
      );
      expect(hintEntries.length).toBe(19);

      for (const [name, def] of hintEntries) {
        let hasAtLeastOneRole = false;
        for (const role of ALL_ROLES) {
          const lines = projectPromptHint(def, role);
          if (lines && lines.length > 0) {
            hasAtLeastOneRole = true;
            for (const line of lines) {
              expect(line.length, `Empty hint line in ${name}`).toBeGreaterThan(0);
            }
          }
        }
        expect(
          hasAtLeastOneRole,
          `No role directives found for ${name} despite having promptHint`,
        ).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Pipeline coherence: assembled directives contain catalog content
  // ─────────────────────────────────────────────────────────────────────────
  describe("Assembled directive coherence", () => {
    it("compose_media flows from catalog → ADMIN assembled directive", () => {
      const directive = assembleRoleDirective("ADMIN");
      // compose_media promptHint for ADMIN
      const adminHints = projectPromptHint(
        CAPABILITY_CATALOG.compose_media,
        "ADMIN",
      );
      expect(adminHints).not.toBeNull();
      for (const line of adminHints!) {
        expect(directive).toContain(line);
      }
    });

    it("admin_web_search flows from catalog → ADMIN assembled directive", () => {
      const directive = assembleRoleDirective("ADMIN");
      const hints = projectPromptHint(
        CAPABILITY_CATALOG.admin_web_search,
        "ADMIN",
      );
      expect(hints).not.toBeNull();
      for (const line of hints!) {
        expect(directive).toContain(line);
      }
    });

    it("search_my_conversations flows for all signed-in roles", () => {
      for (const role of [
        "AUTHENTICATED",
        "APPRENTICE",
        "STAFF",
        "ADMIN",
      ] as RoleName[]) {
        const directive = assembleRoleDirective(role);
        const hints = projectPromptHint(
          CAPABILITY_CATALOG.search_my_conversations,
          role,
        );
        expect(hints, `No hints for ${role}`).not.toBeNull();
        for (const line of hints!) {
          expect(directive).toContain(line);
        }
      }
    });

    it("ANONYMOUS gets no tool-specific promptHints from catalog", () => {
      let hintCount = 0;
      for (const def of Object.values(CAPABILITY_CATALOG)) {
        const hints = projectPromptHint(def, "ANONYMOUS");
        if (hints && hints.length > 0) hintCount += hints.length;
      }
      expect(hintCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Registry coverage consistency
  // ─────────────────────────────────────────────────────────────────────────
  describe("Registry coverage", () => {
    it("catalog has 55+ entries", () => {
      expect(catalogEntries.length).toBeGreaterThanOrEqual(55);
    });

    it("every catalog entry has core, runtime, and presentation facets", () => {
      for (const [name, def] of catalogEntries) {
        expect(def.core, `Missing core for ${name}`).toBeDefined();
        expect(def.core.name, `core.name mismatch for ${name}`).toBe(name);
        expect(def.runtime, `Missing runtime for ${name}`).toBeDefined();
        expect(
          def.presentation,
          `Missing presentation for ${name}`,
        ).toBeDefined();
      }
    });

    it("catalog key matches core.name for every entry", () => {
      for (const [key, def] of catalogEntries) {
        expect(def.core.name).toBe(key);
      }
    });

    it("presentation projections have unique toolNames", () => {
      const toolNames = catalogEntries.map(([, def]) =>
        projectPresentationDescriptor(def).toolName,
      );
      const unique = new Set(toolNames);
      expect(unique.size).toBe(toolNames.length);
    });
  });
});
