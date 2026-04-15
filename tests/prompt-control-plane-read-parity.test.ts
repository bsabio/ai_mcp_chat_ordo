import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { buildPromptControlPlaneService } from "@/lib/prompts/prompt-control-plane-service";
import { loadAdminPromptDetail, loadAdminPromptSlots } from "@/lib/admin/prompts/admin-prompts";
import { ensureSchema } from "@/lib/db/schema";
import { promptGet, promptList } from "@/lib/capabilities/shared/prompt-tool";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  ensureSchema(db);
  return db;
}

function createService(db: Database.Database) {
  return buildPromptControlPlaneService({
    promptRepo: new SystemPromptDataMapper(db),
    getFallbackBase: () => new ConfigIdentitySource().getIdentity(),
    getFallbackDirective: (role) => ROLE_DIRECTIVES[role as keyof typeof ROLE_DIRECTIVES] ?? null,
  });
}

describe("prompt control-plane read parity", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
  });

  it("exposes fallback-backed runtime coverage through prompt_get", async () => {
    db.prepare(
      `UPDATE system_prompts SET is_active = 0 WHERE role = 'APPRENTICE' AND prompt_type = 'role_directive'`,
    ).run();

    const service = createService(db);
    const result = await promptGet(
      { service },
      { role: "APPRENTICE", prompt_type: "role_directive" },
    ) as {
      error?: string;
      runtime_coverage: string;
      content: string;
      version: number | null;
    };

    expect(result.error).toBeUndefined();
    expect(result.runtime_coverage).toBe("fallback");
    expect(result.version).toBeNull();
    expect(result.content).toContain("APPRENTICE (STUDENT)");
  });

  it("returns missing coverage only when neither stored nor fallback content exists", async () => {
    const service = createService(db);
    const result = await promptGet(
      { service },
      { role: "ALL", prompt_type: "role_directive" },
    ) as { error?: string; runtime_coverage: string };

    expect(result.error).toContain("No prompt found");
    expect(result.runtime_coverage).toBe("missing");
  });

  it("keeps admin detail parity with MCP for fallback-backed slots", async () => {
    db.prepare(
      `UPDATE system_prompts SET is_active = 0 WHERE role = 'APPRENTICE' AND prompt_type = 'role_directive'`,
    ).run();

    const service = createService(db);
    const adminDetail = await loadAdminPromptDetail("APPRENTICE", "role_directive", service);
    const mcpDetail = await promptGet(
      { service },
      { role: "APPRENTICE", prompt_type: "role_directive" },
    ) as {
      runtime_coverage: string;
      content: string;
      version: number | null;
    };

    expect(adminDetail.slot.runtimeCoverage).toBe("fallback");
    expect(adminDetail.slot.activeVersion).toBeNull();
    expect(adminDetail.activeContent).toBe(mcpDetail.content);
    expect(adminDetail.fallbackContent).toBe(mcpDetail.content);
    expect(mcpDetail.runtime_coverage).toBe(adminDetail.slot.runtimeCoverage);
    expect(mcpDetail.version).toBe(adminDetail.slot.activeVersion);
  });

  it("adds runtime slot coverage to prompt_list without removing stored version rows", async () => {
    db.prepare(
      `UPDATE system_prompts SET is_active = 0 WHERE role = 'APPRENTICE' AND prompt_type = 'role_directive'`,
    ).run();

    const service = createService(db);
    const result = await promptList(
      { service },
      {},
    ) as {
      prompts: Array<{ role: string; prompt_type: string }>;
      runtime_slots: Array<{ role: string; prompt_type: string; runtime_coverage: string }>;
    };

    expect(result.prompts.some((prompt) => prompt.role === "APPRENTICE" && prompt.prompt_type === "role_directive")).toBe(true);
    expect(result.runtime_slots).toContainEqual({
      role: "APPRENTICE",
      prompt_type: "role_directive",
      active_version: null,
      total_versions: 1,
      last_updated: expect.any(String),
      updated_by: null,
      runtime_coverage: "fallback",
    });
  });

  it("keeps admin slot listing aligned with MCP runtime slot coverage", async () => {
    db.prepare(
      `UPDATE system_prompts SET is_active = 0 WHERE role = 'APPRENTICE' AND prompt_type = 'role_directive'`,
    ).run();

    const service = createService(db);
    const adminSlots = await loadAdminPromptSlots(service);
    const mcpSlots = await promptList(
      { service },
      {},
    ) as {
      runtime_slots: Array<{ role: string; prompt_type: string; runtime_coverage: string }>;
    };

    expect(adminSlots.map((slot) => `${slot.role}:${slot.promptType}`)).toEqual([
      "ALL:base",
      "ANONYMOUS:role_directive",
      "AUTHENTICATED:role_directive",
      "APPRENTICE:role_directive",
      "STAFF:role_directive",
      "ADMIN:role_directive",
    ]);
    expect(mcpSlots.runtime_slots.map((slot) => `${slot.role}:${slot.prompt_type}`)).toEqual(
      adminSlots.map((slot) => `${slot.role}:${slot.promptType}`),
    );
    expect(adminSlots.find((slot) => slot.role === "APPRENTICE")?.runtimeCoverage).toBe("fallback");
  });
});