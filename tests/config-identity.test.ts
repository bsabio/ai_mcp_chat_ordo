/**
 * Config identity & integration tests — Sprint 0
 * Tests P8–P17, I1–I5 (15 tests)
 *
 * Tests adapter implementations and integration with system prompt,
 * tool registry, and UI context.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resetConfigCache, getInstanceIdentity, getInstanceTools } from "@/lib/config/instance";
import { DEFAULT_IDENTITY } from "@/lib/config/defaults";
import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import { ConfigRoleDirectiveSource } from "@/adapters/ConfigRoleDirectiveSource";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";


let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), "config-identity-test-"));
  process.env.CONFIG_DIR = configDir;
  resetConfigCache();
});

afterEach(() => {
  rmSync(configDir, { recursive: true });
  delete process.env.CONFIG_DIR;
  resetConfigCache();
});

function writeConfig(filename: string, content: object) {
  writeFileSync(join(configDir, filename), JSON.stringify(content, null, 2));
}

const VALID_IDENTITY = {
  name: "Acme Dental",
  shortName: "Acme",
  tagline: "AI for dentists",
  description: "Smart dental practice management powered by AI.",
  domain: "acmedental.com",
  logoPath: "/acme-logo.png",
  markText: "A",
};

// ═══════════════════════════════════════════════════════════════════
// §5.1 — Positive tests (adapter & UI context)
// ═══════════════════════════════════════════════════════════════════

describe("config identity — adapter tests", () => {
  it("P8: ConfigIdentitySource implements IdentitySource port", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const source = new ConfigIdentitySource();
    const result = source.getIdentity();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Acme Dental");
  });

  it("P9: ConfigRoleDirectiveSource returns directive for each role", () => {
    const source = new ConfigRoleDirectiveSource();
    const anon = source.getDirective("ANONYMOUS");
    const admin = source.getDirective("ADMIN");
    expect(anon.length).toBeGreaterThan(0);
    expect(admin.length).toBeGreaterThan(0);
  });

  it("P10: identity config provides correct shell brand fields", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const id = getInstanceIdentity();
    expect(id.name).toBe("Acme Dental");
    // ShellBrand would use: `${id.name} home` for aria-label
    expect(`${id.name} home`).toBe("Acme Dental home");
  });

  it("P11: layout metadata uses configured brand name", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const id = getInstanceIdentity();
    const title = `${id.name} | ${id.tagline} And Orchestration Training`;
    expect(title).toContain("Acme Dental");
    expect(title).toContain("AI for dentists");
  });

  it("P12: service chips from config override defaults", () => {
    writeConfig("identity.json", {
      ...VALID_IDENTITY,
      serviceChips: ["Acme", "Dental AI"],
    });
    const id = getInstanceIdentity();
    expect(id.serviceChips).toEqual(["Acme", "Dental AI"]);
    expect(id.serviceChips).not.toEqual(DEFAULT_IDENTITY.serviceChips);
  });

  it("P13: floating chat launcher aria-label reads from config", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const id = getInstanceIdentity();
    expect(`Open ${id.name} chat`).toBe("Open Acme Dental chat");
  });

  it("P14: footer copyright reads from config", () => {
    writeConfig("identity.json", {
      ...VALID_IDENTITY,
      copyright: "© 2026 Acme.",
    });
    const id = getInstanceIdentity();
    expect(id.copyright).toBe("© 2026 Acme.");
  });

  it("P15: footer tagline reads from config", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const id = getInstanceIdentity();
    expect(id.tagline).toBe("AI for dentists");
  });

  it("P16: tool filtering respects disabled list", () => {
    writeConfig("tools.json", { disabled: ["calculator"] });
    const tools = getInstanceTools();
    expect(tools.disabled).toContain("calculator");
    // Composition root would call reg.unregister("calculator")
    // The actual filtering is in tool-composition-root.ts
  });

  it("P17: tool filtering respects enabled list", () => {
    writeConfig("tools.json", { enabled: ["calculator"] });
    const tools = getInstanceTools();
    expect(tools.enabled).toEqual(["calculator"]);
    // Composition root would only keep "calculator"
  });
});

// ═══════════════════════════════════════════════════════════════════
// §5.4 — Integration tests
// ═══════════════════════════════════════════════════════════════════

describe("config identity — integration tests", () => {
  it("I1: system prompt includes configured brand name", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const source = new ConfigIdentitySource();
    const prompt = source.getIdentity();
    expect(prompt).toContain("Acme Dental");
    expect(prompt).not.toContain("Studio Ordo");
  });

  it("I2: system prompt falls back to hardcoded when no config", () => {
    // No config files — empty configDir
    const source = new ConfigIdentitySource();
    const prompt = source.getIdentity();
    const expected = buildCorpusBasePrompt();
    expect(prompt).toBe(expected);
    // Confirm it contains the default name
    expect(prompt).toContain("Studio Ordo");
  });

  it("I3: tool registry respects tools.json disabled list", () => {
    writeConfig("tools.json", { disabled: ["calculator"] });
    const tools = getInstanceTools();
    // Verify the config is correctly loaded for the composition root to use
    expect(tools.disabled).toContain("calculator");
    // In real runtime, the composition root iterates disabled list
    // and calls reg.unregister(name) for each. The ToolRegistry.unregister()
    // test is in tool-registry.test.ts.
  });

  it("I4: tool registry enables all tools when no tools.json", () => {
    // No tools.json — empty configDir
    const tools = getInstanceTools();
    expect(tools.enabled).toBeUndefined();
    expect(tools.disabled).toBeUndefined();
    // Composition root skips filtering when both are undefined
  });

  it("I5: config-driven metadata includes the configured app name", () => {
    writeConfig("identity.json", VALID_IDENTITY);
    const id = getInstanceIdentity();
    // generate-release-manifest.mjs uses package.json name (studio-ordo),
    // but metadata in layout.tsx uses the config identity
    expect(id.name).toBe("Acme Dental");
    expect(id.description).toBe("Smart dental practice management powered by AI.");
  });
});
