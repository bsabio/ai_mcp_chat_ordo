/**
 * Sprint 12 — Registry Convergence Tests
 *
 * Validates:
 * 1. Presentation registry derives ALL entries from catalog
 * 2. Job registry derives ALL entries from catalog
 * 3. Browser registry derives ALL entries from catalog
 * 4. No manual createDescriptor/defineEditorialCapability calls remain
 * 5. Every catalog tool has a presentation entry
 * 6. All registries match catalog metadata exactly
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import {
  CAPABILITY_CATALOG,
  projectPresentationDescriptor,
  projectJobCapability,
  projectBrowserCapability,
} from "./catalog";

import {
  CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES,
  getCapabilityPresentationDescriptor,
} from "@/frameworks/ui/chat/registry/capability-presentation-registry";

import {
  JOB_CAPABILITY_REGISTRY,
  JOB_CAPABILITY_TOOL_NAMES,
  getJobCapability,
} from "@/lib/jobs/job-capability-registry";

import {
  BROWSER_CAPABILITY_TOOL_NAMES,
  getBrowserCapabilityDescriptor,
} from "@/lib/media/browser-runtime/browser-capability-registry";

const ROOT = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

describe("Sprint 12 — Registry Convergence", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Presentation registry
  // ─────────────────────────────────────────────────────────────────────────
  describe("Presentation registry", () => {
    it("has NO manual createDescriptor() calls", () => {
      const source = readSource(
        "src/frameworks/ui/chat/registry/capability-presentation-registry.ts",
      );
      expect(source).not.toContain("function createDescriptor(");
      expect(source).not.toContain("createDescriptor(\"");
    });

    it("covers every catalog tool", () => {
      const catalogNames = Object.keys(CAPABILITY_CATALOG);
      for (const name of catalogNames) {
        const desc = getCapabilityPresentationDescriptor(name);
        expect(desc, `Missing presentation descriptor for: ${name}`).toBeDefined();
      }
    });

    it("has at least 55 entries (all catalog tools)", () => {
      expect(CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES.length).toBeGreaterThanOrEqual(55);
    });

    it("matches catalog metadata for every entry", () => {
      for (const def of Object.values(CAPABILITY_CATALOG)) {
        const expected = projectPresentationDescriptor(def);
        const actual = getCapabilityPresentationDescriptor(def.core.name);
        expect(actual, `Parity check failed for: ${def.core.name}`).toEqual(expected);
      }
    });

    it("includes all 10 previously-missing tools", () => {
      const previouslyMissing = [
        "admin_prioritize_leads",
        "admin_prioritize_offer",
        "admin_search",
        "admin_triage_routing_risk",
        "get_admin_affiliate_summary",
        "get_deferred_job_status",
        "get_my_job_status",
        "list_admin_referral_exceptions",
        "list_deferred_jobs",
        "list_my_jobs",
      ];
      for (const name of previouslyMissing) {
        expect(
          getCapabilityPresentationDescriptor(name),
          `Still missing: ${name}`,
        ).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Job capability registry
  // ─────────────────────────────────────────────────────────────────────────
  describe("Job capability registry", () => {
    it("has NO manual defineEditorialCapability() calls", () => {
      const source = readSource("src/lib/jobs/job-capability-registry.ts");
      expect(source).not.toContain("function defineEditorialCapability(");
      expect(source).not.toContain("defineEditorialCapability(\"");
      expect(source).not.toContain("ADMIN_ONLY_EDITORIAL_POLICY");
      expect(source).not.toContain("AUTOMATIC_EDITORIAL_RETRY_POLICY");
    });

    it("covers all 10 deferred job handler names", () => {
      for (const name of JOB_CAPABILITY_TOOL_NAMES) {
        const cap = getJobCapability(name);
        expect(cap, `Missing job capability for: ${name}`).not.toBeNull();
      }
    });

    it("derives the deferred job tool list from catalog job facets", () => {
      const catalogJobNames = Object.entries(CAPABILITY_CATALOG)
        .filter(([, capability]) => projectJobCapability(capability) !== null)
        .map(([name]) => name);

      expect(JOB_CAPABILITY_TOOL_NAMES).toEqual(catalogJobNames);
    });

    it("matches catalog metadata for every deferred tool", () => {
      for (const name of JOB_CAPABILITY_TOOL_NAMES) {
        const catalogDef = CAPABILITY_CATALOG[name as keyof typeof CAPABILITY_CATALOG];
        expect(catalogDef, `Catalog missing: ${name}`).toBeDefined();
        const expected = projectJobCapability(catalogDef);
        expect(expected, `projectJobCapability returned null for: ${name}`).not.toBeNull();
        const actual = JOB_CAPABILITY_REGISTRY[name];
        expect(actual).toEqual(expected);
      }
    });

    it("has exactly 10 entries", () => {
      expect(Object.keys(JOB_CAPABILITY_REGISTRY)).toHaveLength(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Browser capability registry
  // ─────────────────────────────────────────────────────────────────────────
  describe("Browser capability registry", () => {
    it("has NO manual descriptor objects", () => {
      const source = readSource(
        "src/lib/media/browser-runtime/browser-capability-registry.ts",
      );
      expect(source).not.toContain("runtimeKind:");
      expect(source).not.toContain("moduleId:");
      expect(source).not.toContain("fallbackPolicy:");
    });

    it("has exactly 4 entries", () => {
      expect(BROWSER_CAPABILITY_TOOL_NAMES).toHaveLength(4);
    });

    it("derives browser entries by iterating the catalog", () => {
      const source = readSource(
        "src/lib/media/browser-runtime/browser-capability-registry.ts",
      );
      expect(source).toContain("Object.entries(CAPABILITY_CATALOG)");
      expect(source).toContain("projectBrowserCapability(definition)");
      expect(source).not.toContain("generate_audio:");
      expect(source).not.toContain("generate_chart:");
      expect(source).not.toContain("generate_graph:");
      expect(source).not.toContain("compose_media:");
    });

    it("covers generate_audio, generate_chart, generate_graph, compose_media", () => {
      const expected = ["generate_audio", "generate_chart", "generate_graph", "compose_media"];
      for (const name of expected) {
        const desc = getBrowserCapabilityDescriptor(name);
        expect(desc, `Missing browser descriptor for: ${name}`).not.toBeNull();
        expect(desc!.capabilityId).toBe(name);
      }
    });

    it("matches catalog metadata for every browser-capable tool", () => {
      for (const name of BROWSER_CAPABILITY_TOOL_NAMES) {
        const catalogDef = CAPABILITY_CATALOG[name as keyof typeof CAPABILITY_CATALOG];
        const expected = projectBrowserCapability(catalogDef);
        const actual = getBrowserCapabilityDescriptor(name);
        expect(actual).toEqual(expected);
      }
    });

    it("each catalog browser entry has required fields", () => {
      for (const name of BROWSER_CAPABILITY_TOOL_NAMES) {
        const desc = getBrowserCapabilityDescriptor(name)!;
        expect(desc.capabilityId).toBeTruthy();
        expect(desc.runtimeKind).toBeTruthy();
        expect(desc.moduleId).toBeTruthy();
        expect(desc.supportedAssetKinds.length).toBeGreaterThan(0);
        expect(desc.fallbackPolicy).toBeTruthy();
        expect(desc.recoveryPolicy).toBeTruthy();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cross-registry consistency
  // ─────────────────────────────────────────────────────────────────────────
  describe("Cross-registry catalog parity", () => {
    it("no duplicate tool metadata outside the catalog", () => {
      // Presentation: no createDescriptor
      const presSource = readSource(
        "src/frameworks/ui/chat/registry/capability-presentation-registry.ts",
      );
      expect(presSource).not.toContain("function createDescriptor(");

      // Job: no defineEditorialCapability
      const jobSource = readSource("src/lib/jobs/job-capability-registry.ts");
      expect(jobSource).not.toContain("function defineEditorialCapability(");

      // Browser: no manual descriptors
      const browserSource = readSource(
        "src/lib/media/browser-runtime/browser-capability-registry.ts",
      );
      expect(browserSource).not.toContain("runtimeKind:");
    });

    it("all browser tools also have presentation entries", () => {
      for (const name of BROWSER_CAPABILITY_TOOL_NAMES) {
        expect(
          getCapabilityPresentationDescriptor(name),
          `Browser tool ${name} missing presentation entry`,
        ).toBeDefined();
      }
    });

    it("all deferred tools also have presentation entries", () => {
      for (const name of JOB_CAPABILITY_TOOL_NAMES) {
        expect(
          getCapabilityPresentationDescriptor(name),
          `Deferred tool ${name} missing presentation entry`,
        ).toBeDefined();
      }
    });
  });
});
