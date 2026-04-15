/**
 * Sprint 18 — Prompt Tool Domain Tests
 *
 * Tests all 5 prompt operations + getPromptToolSchemas() factory
 * using a mock PromptControlPlaneService.
 */
import { describe, it, expect, vi } from "vitest";
import type { PromptToolDeps } from "./prompt-tool";

const {
  findPromptTurnProvenanceMock,
  replayPromptTurnProvenanceRecordMock,
} = vi.hoisted(() => ({
  findPromptTurnProvenanceMock: vi.fn(),
  replayPromptTurnProvenanceRecordMock: vi.fn(),
}));

vi.mock("@/lib/prompts/prompt-provenance-service", () => ({
  findPromptTurnProvenance: findPromptTurnProvenanceMock,
  replayPromptTurnProvenanceRecord: replayPromptTurnProvenanceRecordMock,
}));

import {
  promptList,
  promptGet,
  promptSet,
  promptRollback,
  promptDiff,
  promptGetProvenance,
  getPromptToolSchemas,
} from "./prompt-tool";

function createMockService() {
  return {
    listSlots: vi.fn().mockResolvedValue([
      {
        role: "ALL",
        promptType: "base",
        activeVersion: 2,
        totalVersions: 2,
        lastUpdated: "2026-01-01T00:00:00Z",
        updatedBy: "admin",
        runtimeCoverage: "db",
      },
      {
        role: "APPRENTICE",
        promptType: "role_directive",
        activeVersion: 1,
        totalVersions: 1,
        lastUpdated: "2026-01-01T00:00:00Z",
        updatedBy: "admin",
        runtimeCoverage: "fallback",
      },
    ]),
    getSlotDetail: vi.fn().mockResolvedValue({
      slot: {
        role: "ALL",
        promptType: "base",
        activeVersion: 2,
        totalVersions: 2,
        lastUpdated: "2026-01-01T00:00:00Z",
        updatedBy: "admin",
        runtimeCoverage: "db",
      },
      versions: [
        {
          role: "ALL",
          promptType: "base",
          version: 1,
          content: "Old prompt",
          isActive: false,
          createdAt: "2025-12-01T00:00:00Z",
          createdBy: "admin",
          notes: "initial",
        },
        {
          role: "ALL",
          promptType: "base",
          version: 2,
          content: "Current prompt",
          isActive: true,
          createdAt: "2026-01-01T00:00:00Z",
          createdBy: "admin",
          notes: "updated",
        },
      ],
      activeContent: "Current prompt",
      storedActiveContent: "Current prompt",
      fallbackContent: null,
    }),
    createVersion: vi.fn().mockResolvedValue({
      created: { version: 3, role: "ALL", promptType: "base" },
    }),
    activateVersion: vi.fn().mockResolvedValue({
      activatedVersion: 3,
      deactivatedVersion: 2,
    }),
    rollback: vi.fn().mockResolvedValue({
      activatedVersion: 1,
      deactivatedVersion: 2,
    }),
    diffVersions: vi.fn().mockResolvedValue({
      role: "ALL",
      promptType: "base",
      versionA: 1,
      versionB: 2,
      diff: "-Old prompt\n+Current prompt",
    }),
  };
}

function createDeps(): PromptToolDeps {
  return { service: createMockService() as unknown as PromptToolDeps["service"] };
}

describe("prompt-tool", () => {
  describe("promptGetProvenance", () => {
    it("returns durable turn provenance and optional replay diagnostics", async () => {
      findPromptTurnProvenanceMock.mockResolvedValue({
        id: "pprov_1",
        conversationId: "conv_1",
        userMessageId: "msg_user_1",
        assistantMessageId: "msg_assistant_1",
        surface: "chat_stream",
        effectiveHash: "hash_prompt",
        slotRefs: [],
        sections: [],
        warnings: [],
        replayContext: {
          surface: "chat_stream",
          role: "ADMIN",
        },
        recordedAt: "2026-01-01T00:00:00Z",
      });
      replayPromptTurnProvenanceRecordMock.mockResolvedValue({
        rebuilt: {
          surface: "chat_stream",
          effectiveHash: "hash_prompt",
          slotRefs: [],
          sections: [],
          warnings: [],
        },
        diff: {
          surfaceChanged: false,
          effectiveHashChanged: false,
          slotRefChanges: [],
          sectionChanges: [],
          warningChanges: [],
          driftWarnings: [],
        },
        matches: true,
      });

      const result = await promptGetProvenance({
        conversation_id: "conv_1",
        turn_id: "msg_assistant_1",
        include_replay_diff: true,
      }) as {
        turn_id: string;
        user_message_id: string;
        assistant_message_id: string;
        replay: { matches: boolean };
      };

      expect(result.turn_id).toBe("msg_assistant_1");
      expect(result.user_message_id).toBe("msg_user_1");
      expect(result.assistant_message_id).toBe("msg_assistant_1");
      expect(result.replay.matches).toBe(true);
    });
  });

  describe("promptList", () => {
    it("returns prompt entries with runtime_slots", async () => {
      const deps = createDeps();
      const result = (await promptList(deps, {})) as {
        prompts: unknown[];
        count: number;
        runtime_slots: unknown[];
      };
      expect(result).toHaveProperty("prompts");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("runtime_slots");
      expect(result.runtime_slots).toHaveLength(2);
    });

    it("includes APPRENTICE in role enumeration", async () => {
      const deps = createDeps();
      const result = (await promptList(deps, {})) as {
        runtime_slots: Array<{ role: string }>;
      };
      const roles = result.runtime_slots.map((s) => s.role);
      expect(roles).toContain("APPRENTICE");
    });
  });

  describe("promptGet", () => {
    it("returns active prompt with content", async () => {
      const deps = createDeps();
      const result = (await promptGet(deps, { role: "ALL", prompt_type: "base" })) as {
        content: string;
        runtime_coverage: string;
      };
      expect(result).toHaveProperty("content", "Current prompt");
      expect(result).toHaveProperty("runtime_coverage", "db");
    });

    it("returns specific version when provided", async () => {
      const deps = createDeps();
      const result = (await promptGet(deps, {
        role: "ALL",
        prompt_type: "base",
        version: 1,
      })) as { version: number; content: string };
      expect(result).toHaveProperty("version", 1);
      expect(result).toHaveProperty("content", "Old prompt");
    });
  });

  describe("promptSet", () => {
    it("creates and activates a new version", async () => {
      const deps = createDeps();
      const result = (await promptSet(deps, {
        role: "ALL",
        prompt_type: "base",
        content: "New prompt",
        notes: "test update",
      })) as { version: number; activated: boolean };
      expect(result).toEqual({ version: 3, activated: true });
    });
  });

  describe("promptRollback", () => {
    it("reactivates a previous version", async () => {
      const deps = createDeps();
      const result = (await promptRollback(deps, {
        role: "ALL",
        prompt_type: "base",
        version: 1,
      })) as { activated_version: number };
      expect(result).toHaveProperty("activated_version", 1);
    });
  });

  describe("promptDiff", () => {
    it("returns diff between two versions", async () => {
      const deps = createDeps();
      const result = (await promptDiff(deps, {
        role: "ALL",
        prompt_type: "base",
        version_a: 1,
        version_b: 2,
      })) as { diff: string };
      expect(result).toHaveProperty("diff");
      expect(result.diff).toContain("-Old prompt");
      expect(result.diff).toContain("+Current prompt");
    });
  });

  describe("getPromptToolSchemas", () => {
    it("returns 6 tool schemas", () => {
      const schemas = getPromptToolSchemas();
      expect(schemas).toHaveLength(6);
    });

    it("contains all expected tool names", () => {
      const schemas = getPromptToolSchemas();
      const names = schemas.map((s) => s.name);
      expect(names).toEqual([
        "prompt_list",
        "prompt_get",
        "prompt_set",
        "prompt_rollback",
        "prompt_diff",
        "prompt_get_provenance",
      ]);
    });

    it("each schema has required structure", () => {
      const schemas = getPromptToolSchemas();
      for (const schema of schemas) {
        expect(schema).toHaveProperty("name");
        expect(schema).toHaveProperty("description");
        expect(schema).toHaveProperty("inputSchema");
        expect(schema.inputSchema).toHaveProperty("type", "object");
      }
    });
  });
});
