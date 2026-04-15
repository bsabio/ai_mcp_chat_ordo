import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("TD-A — task-origin canonical extraction (F1)", () => {
  it("P1: task-origin-handoff.ts is the canonical handoff module", () => {
    const handoff = readSource("src/lib/chat/task-origin-handoff.ts");
    const loaders = readSource("src/lib/operator/operator-signal-loaders.ts");

    expect(handoff).toContain("export interface TaskOriginHandoff");
    expect(loaders).toContain('from "./operator-signal-backend"');

    expect(handoff).not.toMatch(/^type DashboardBlockId\s*=/m);
    expect(loaders).not.toMatch(/^type DashboardBlockId\s*=/m);
  });

  it("N1: no local DashboardBlockId type definition in task-origin-handoff.ts", () => {
    const handoff = readSource("src/lib/chat/task-origin-handoff.ts");
    expect(handoff).not.toMatch(/^type DashboardBlockId\s*=/m);
  });

  it("N2: no local DashboardBlockId type definition in operator-signal-loaders.ts", () => {
    const loaders = readSource("src/lib/operator/operator-signal-loaders.ts");
    expect(loaders).not.toMatch(/^type DashboardBlockId\s*=/m);
  });
});

describe("TD-A — ROLE_DIRECTIVES entity extraction (F2, F3)", () => {
  it("P2: ROLE_DIRECTIVES lives in core/entities/role-directives.ts", () => {
    const entity = readSource("src/core/entities/role-directives.ts");
    const interactor = readSource("src/core/use-cases/ChatPolicyInteractor.ts");

    expect(entity).toContain("export const ROLE_DIRECTIVES");
    expect(interactor).not.toContain("export const ROLE_DIRECTIVES");
    expect(interactor).not.toContain("export { ROLE_DIRECTIVES");
  });

  it("P3: policy.ts delegates prompt assembly to prompt-runtime", () => {
    const policy = readSource("src/lib/chat/policy.ts");

    expect(policy).toContain('from "@/lib/chat/prompt-runtime"');
    expect(policy).toContain("createPromptAssemblyBuilder");
    expect(policy).not.toContain("ChatPolicyInteractor");
  });

  it("N3: ChatPolicyInteractor does not export ROLE_DIRECTIVES", () => {
    const interactor = readSource("src/core/use-cases/ChatPolicyInteractor.ts");
    expect(interactor).not.toMatch(/export\s+(const|{)\s*ROLE_DIRECTIVES/);
  });
});

describe("TD-A — prompt builder delegation (F4)", () => {
  it("P4: policy.ts avoids module-scope prompt state and delegates through the builder factory", () => {
    const policy = readSource("src/lib/chat/policy.ts");

    expect(policy).not.toMatch(/^const\s+\w+\s*=\s*new ConfigIdentitySource\(\)/m);
    expect(policy).not.toMatch(/^const\s+BASE_PROMPT/m);
    expect(policy).toContain("export async function createSystemPromptBuilder");
    expect(policy).toContain("return createPromptAssemblyBuilder({");
  });

  it("N4: policy.ts has no module-scope ConfigIdentitySource instantiation", () => {
    const policy = readSource("src/lib/chat/policy.ts");
    // ConfigIdentitySource should only appear inside a function body
    const lines = policy.split("\n");
    let insideFunction = false;
    for (const line of lines) {
      if (line.includes("function ") || line.includes("=> {")) insideFunction = true;
      if (!insideFunction && line.includes("new ConfigIdentitySource()")) {
        throw new Error("ConfigIdentitySource instantiated at module scope");
      }
      if (insideFunction && line.trim() === "}") insideFunction = false;
    }
  });
});

describe("TD-A — cohesion extraction (F5)", () => {
  it("P5: looksLikeMath lives in math-classifier.ts", () => {
    const classifier = readSource("src/lib/chat/math-classifier.ts");
    const policy = readSource("src/lib/chat/policy.ts");

    expect(classifier).toContain("export function looksLikeMath");
    expect(policy).not.toContain("looksLikeMath");
  });

  it("N5: no getModelCandidates wrapper in policy.ts", () => {
    const policy = readSource("src/lib/chat/policy.ts");
    expect(policy).not.toContain("getModelCandidates");
  });
});

describe("TD-A — dead parameter removal (F6)", () => {
  it("P6: resolveShellHomeHref accepts no parameters", () => {
    const nav = readSource("src/lib/shell/shell-navigation.ts");
    const match = nav.match(/export function resolveShellHomeHref\(([^)]*)\)/);
    expect(match).toBeTruthy();
    expect(match![1].trim()).toBe("");
  });
});

describe("TD-A — naming corrections (F7)", () => {
  it("P7: resolveCommandRoutes replaces resolveCommandPaletteRoutes", () => {
    const nav = readSource("src/lib/shell/shell-navigation.ts");
    expect(nav).toContain("export function resolveCommandRoutes");
    expect(nav).not.toContain("resolveCommandPaletteRoutes");
  });

  it("P8: showInCommands replaces showInCommandPalette", () => {
    const nav = readSource("src/lib/shell/shell-navigation.ts");
    expect(nav).toContain("showInCommands");
    expect(nav).not.toContain("showInCommandPalette");
  });

  it("N6: no references to deleted showInCommandPalette flag in source", () => {
    const nav = readSource("src/lib/shell/shell-navigation.ts");
    const commands = readSource("src/lib/shell/shell-commands.ts");
    expect(nav).not.toContain("showInCommandPalette");
    expect(commands).not.toContain("showInCommandPalette");
  });

  it("N7: no references to resolveCommandPaletteRoutes in source", () => {
    const nav = readSource("src/lib/shell/shell-navigation.ts");
    const commands = readSource("src/lib/shell/shell-commands.ts");
    expect(nav).not.toContain("resolveCommandPaletteRoutes");
    expect(commands).not.toContain("resolveCommandPaletteRoutes");
  });
});

describe("TD-A — file rename (F8)", () => {
  it("P9: corpus-vocabulary.ts replaces corpus-config.ts", () => {
    expect(existsSync(join(process.cwd(), "src/lib/corpus-vocabulary.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/corpus-config.ts"))).toBe(false);
  });

  it("N8: corpus-config.ts does not exist", () => {
    expect(existsSync(join(process.cwd(), "src/lib/corpus-config.ts"))).toBe(false);
  });
});

describe("TD-A — behavioral preservation", () => {
  it("P10: system prompt still builds correctly after refactoring", async () => {
    const { buildSystemPrompt } = await import("@/lib/chat/policy");
    const prompt = await buildSystemPrompt("AUTHENTICATED");
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("P11: looksLikeMath still classifies correctly after extraction", async () => {
    const { looksLikeMath } = await import("@/lib/chat/math-classifier");
    expect(looksLikeMath("2 + 2")).toBe(true);
    expect(looksLikeMath("hello world")).toBe(false);
  });

  it("P12: resolveShellHomeHref still returns /", async () => {
    const { resolveShellHomeHref } = await import("@/lib/shell/shell-navigation");
    expect(resolveShellHomeHref()).toBe("/");
  });
});

describe("TD-A — edge tests", () => {
  it("E1: ConfigRoleDirectiveSource returns directives for all roles", async () => {
    const { ConfigRoleDirectiveSource } = await import("@/adapters/ConfigRoleDirectiveSource");
    const source = new ConfigRoleDirectiveSource();
    for (const role of ["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"] as const) {
      const directive = source.getDirective(role);
      expect(directive).toBeTruthy();
      expect(directive.length).toBeGreaterThan(0);
    }
  });

  it("E2: task-origin handoff accepts every operator signal id", async () => {
    const handoff = readSource("src/lib/chat/task-origin-handoff.ts");
    const types = readSource("src/lib/operator/operator-signal-types.ts");

    // Extract all block IDs from the canonical type
    const typeMembers = [...types.matchAll(/^\s*\|\s+"(\w+)"/gm)].map((m) => m[1]);
    expect(typeMembers).toHaveLength(13);

    // Ensure the set in handoff references all of them
    for (const member of typeMembers) {
      expect(handoff).toContain(`"${member}"`);
    }
  });

  it("E3: corpus-vocabulary.ts exports are unchanged", async () => {
    const mod = await import("@/lib/corpus-vocabulary");
    expect(mod.corpusConfig).toBeTruthy();
    expect(mod.sourceTypeRegistry).toBeTruthy();
    expect(mod.getCorpusToolName).toBeTruthy();
    expect(mod.getCorpusSearchDescription).toBeTruthy();
    expect(mod.getCorpusSummaryDescription).toBeTruthy();
    expect(mod.buildCorpusBasePrompt).toBeTruthy();
  });

  it("E4: shell command definitions still resolve", async () => {
    const { resolveShellNavigationCommandDefinitions } = await import("@/lib/shell/shell-commands");
    const defs = resolveShellNavigationCommandDefinitions();
    expect(Array.isArray(defs)).toBe(true);
    for (const def of defs) {
      expect(def).toHaveProperty("id");
      expect(def).toHaveProperty("title");
      expect(def).toHaveProperty("href");
      expect(def.kind).toBe("navigation");
    }
  });
});
