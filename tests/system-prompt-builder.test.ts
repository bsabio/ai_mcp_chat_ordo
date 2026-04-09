import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "@/lib/db/schema";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { HardcodedIdentitySource } from "@/adapters/HardcodedIdentitySource";
import { HardcodedRoleDirectiveSource } from "@/adapters/HardcodedRoleDirectiveSource";
import { ChatPolicyInteractor } from "@/core/use-cases/ChatPolicyInteractor";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";
import { buildSummaryContextBlock } from "@/lib/chat/summary-context";
import { buildRoutingContextBlock } from "@/lib/chat/routing-context";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { RoleName } from "@/core/entities/user";

const ROLES: RoleName[] = ["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"];

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  ensureSchema(db);
  return db;
}

// ---------------------------------------------------------------------------
// §6.1 Positive tests
// ---------------------------------------------------------------------------
describe("SystemPromptBuilder", () => {
  it("P1: produces identity-only output when no other sections added", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "identity", content: "I am Ordo.", priority: 10 });
    expect(builder.build()).toBe("I am Ordo.");
  });

  it("P2: produces identity + directive for each role", () => {
    const base = buildCorpusBasePrompt();
    for (const role of ROLES) {
      const directive = ROLE_DIRECTIVES[role];
      const output = new SystemPromptBuilder()
        .withSection({ key: "identity", content: base, priority: 10 })
        .withSection({ key: "role_directive", content: directive, priority: 20 })
        .build();
      expect(output).toBe(base + directive);
    }
  });

  it("P3: sections are ordered by priority", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "c", content: "C", priority: 50 })
      .withSection({ key: "a", content: "A", priority: 10 })
      .withSection({ key: "b", content: "B", priority: 30 });
    expect(builder.build()).toBe("ABC");
  });

  it("P3a: base prompt forbids exposing internal navigation metadata", () => {
    const base = buildCorpusBasePrompt();
    expect(base).toContain("Never expose internal route IDs");
  });

  it("P4: withConversationSummary appends summary block", () => {
    const builder = new SystemPromptBuilder()
      .withConversationSummary("test summary");
    const output = builder.build();
    expect(output).toContain("[Server summary of earlier conversation]");
    expect(output).toContain("test summary");
  });

  it("P5: withRoutingContext appends routing block", () => {
    const snapshot = createConversationRoutingSnapshot({
      lane: "organization",
      confidence: 0.91,
    });
    const builder = new SystemPromptBuilder()
      .withRoutingContext(snapshot);
    const output = builder.build();
    expect(output).toContain("[Server routing metadata]");
    expect(output).toContain("lane=organization");
  });

  it("P6: withSection adds ad-hoc section", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "custom", content: "custom text", priority: 90 });
    expect(builder.build()).toBe("custom text");
  });

  it("P7: all context blocks present simultaneously in priority order", () => {
    const snapshot = createConversationRoutingSnapshot({ lane: "individual", confidence: 0.8 });
    const builder = new SystemPromptBuilder()
      .withSection({ key: "identity", content: "IDENTITY", priority: 10 })
      .withSection({ key: "role_directive", content: "DIRECTIVE", priority: 20 })
      .withConversationSummary("some summary")
      .withRoutingContext(snapshot)
      .withSection({ key: "task_origin_handoff", content: "TASK_ORIGIN", priority: 90 });
    const output = builder.build();

    // Verify all blocks present
    expect(output).toContain("IDENTITY");
    expect(output).toContain("DIRECTIVE");
    expect(output).toContain("[Server summary of earlier conversation]");
    expect(output).toContain("[Server routing metadata]");
    expect(output).toContain("TASK_ORIGIN");

    // Verify ordering: identity before directive before summary before routing before task-origin handoff
    const identityIdx = output.indexOf("IDENTITY");
    const directiveIdx = output.indexOf("DIRECTIVE");
    const summaryIdx = output.indexOf("[Server summary of earlier conversation]");
    const routingIdx = output.indexOf("[Server routing metadata]");
    const taskOriginIdx = output.indexOf("TASK_ORIGIN");

    expect(identityIdx).toBeLessThan(directiveIdx);
    expect(directiveIdx).toBeLessThan(summaryIdx);
    expect(summaryIdx).toBeLessThan(routingIdx);
    expect(routingIdx).toBeLessThan(taskOriginIdx);
  });

  for (const role of ROLES) {
    it(`P8-11: ${role} role produces correct output via withSection`, () => {
      const base = buildCorpusBasePrompt();
      const directive = ROLE_DIRECTIVES[role];
      const output = new SystemPromptBuilder()
        .withSection({ key: "identity", content: base, priority: 10 })
        .withSection({ key: "role_directive", content: directive, priority: 20 })
        .build();
      expect(output).toBe(base + directive);
    });
  }

  it("P12: streaming route context matches manual concatenation", () => {
    const base = "BASE";
    const directive = "DIRECTIVE";
    const summaryText = "previous topics discussed";
    const snapshot = createConversationRoutingSnapshot({
      lane: "development",
      confidence: 0.75,
    });
    const taskOriginBlock = "\nTASK_ORIGIN_HANDOFF_BLOCK";

    // Manual concatenation (old code path)
    const manual =
      base + directive +
      buildSummaryContextBlock(summaryText) +
      buildRoutingContextBlock(snapshot) +
      taskOriginBlock;

    // Builder path
    const builderOutput = new SystemPromptBuilder()
      .withSection({ key: "identity", content: base, priority: 10 })
      .withSection({ key: "role_directive", content: directive, priority: 20 })
      .withConversationSummary(summaryText)
      .withRoutingContext(snapshot)
      .withSection({ key: "task_origin_handoff", content: taskOriginBlock, priority: 90 })
      .build();

    expect(builderOutput).toBe(manual);
  });

  it("P13: HardcodedIdentitySource returns buildCorpusBasePrompt()", () => {
    const source = new HardcodedIdentitySource();
    expect(source.getIdentity()).toBe(buildCorpusBasePrompt());
  });

  it("P14: HardcodedRoleDirectiveSource returns correct directive per role", () => {
    const source = new HardcodedRoleDirectiveSource();
    for (const role of ROLES) {
      expect(source.getDirective(role)).toBe(ROLE_DIRECTIVES[role]);
    }
  });
});

// ---------------------------------------------------------------------------
// §6.2 Negative tests
// ---------------------------------------------------------------------------
describe("SystemPromptBuilder — negative cases", () => {
  it("N1: build() returns empty string with no sections", () => {
    expect(new SystemPromptBuilder().build()).toBe("");
  });

  it("N2: withConversationSummary(null) is a no-op", () => {
    const output = new SystemPromptBuilder()
      .withSection({ key: "identity", content: "ID", priority: 10 })
      .withConversationSummary(null)
      .build();
    expect(output).toBe("ID");
    expect(output).not.toContain("[Server summary");
  });

  it("N3: withConversationSummary('') is a no-op", () => {
    const output = new SystemPromptBuilder()
      .withSection({ key: "identity", content: "ID", priority: 10 })
      .withConversationSummary("")
      .build();
    expect(output).toBe("ID");
  });

  it("N4: withSection with empty content is skipped", () => {
    const output = new SystemPromptBuilder()
      .withSection({ key: "x", content: "", priority: 10 })
      .build();
    expect(output).toBe("");
  });

  it("N5: duplicate key replaces previous section", () => {
    const output = new SystemPromptBuilder()
      .withSection({ key: "a", content: "first", priority: 10 })
      .withSection({ key: "a", content: "second", priority: 10 })
      .build();
    expect(output).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// §6.3 Edge tests
// ---------------------------------------------------------------------------
describe("SystemPromptBuilder — edge cases", () => {
  it("E1: sections with equal priority maintain insertion order", () => {
    const output = new SystemPromptBuilder()
      .withSection({ key: "x", content: "X", priority: 50 })
      .withSection({ key: "y", content: "Y", priority: 50 })
      .build();
    expect(output).toBe("XY");
  });

  it("E2: builder is reusable — build() twice returns same output", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "a", content: "A", priority: 10 })
      .withSection({ key: "b", content: "B", priority: 20 });
    expect(builder.build()).toBe("AB");
    expect(builder.build()).toBe("AB");
  });

  it("E3: builder handles very long identity string", () => {
    const longContent = "x".repeat(15_000);
    const output = new SystemPromptBuilder()
      .withSection({ key: "identity", content: longContent, priority: 10 })
      .build();
    expect(output).toBe(longContent);
    expect(output.length).toBe(15_000);
  });

  it("E4: routing block with all-null snapshot fields", () => {
    const snapshot = createConversationRoutingSnapshot();
    const output = new SystemPromptBuilder()
      .withRoutingContext(snapshot)
      .build();
    expect(output).toContain("[Server routing metadata]");
    expect(output).toContain("lane=uncertain");
  });

  it("E5: task-origin handoff as ad-hoc section sorts correctly after routing", () => {
    const snapshot = createConversationRoutingSnapshot({ lane: "organization", confidence: 0.5 });
    const output = new SystemPromptBuilder()
      .withSection({ key: "task_origin_handoff", content: "\nTASK_ORIGIN", priority: 90 })
      .withRoutingContext(snapshot)
      .build();

    const routingIdx = output.indexOf("[Server routing metadata]");
    const taskOriginIdx = output.indexOf("TASK_ORIGIN");
    expect(routingIdx).toBeLessThan(taskOriginIdx);
  });

  it("E6: withRoutingContext always produces content even for default uncertain snapshot", () => {
    const snapshot = createConversationRoutingSnapshot();
    const output = new SystemPromptBuilder()
      .withRoutingContext(snapshot)
      .build();
    expect(output.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §6.4 Integration / parity tests
// ---------------------------------------------------------------------------
describe("Output parity — builder vs ChatPolicyInteractor", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
  });

  for (const role of ROLES) {
    it(`I1: ${role} — builder output matches interactor output`, async () => {
      const repo = new DefaultingSystemPromptRepository(
        new SystemPromptDataMapper(db),
        buildCorpusBasePrompt(),
        ROLE_DIRECTIVES,
      );
      const interactor = new ChatPolicyInteractor(repo);
      const interactorOutput = await interactor.execute({ role });

      const base = await repo.getActive("ALL", "base");
      const directive = await repo.getActive(role, "role_directive");
      const builderOutput = new SystemPromptBuilder()
        .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
        .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 })
        .build();

      expect(builderOutput).toBe(interactorOutput);
    });
  }

  it("I2: createSystemPromptBuilder respects DB-stored prompt", async () => {
    const mapper = new SystemPromptDataMapper(db);
    const v2 = await mapper.createVersion({
      role: "ALL",
      promptType: "base",
      content: "Custom admin prompt",
      createdBy: "test_admin",
      notes: "custom override",
    });
    await mapper.activate("ALL", "base", v2.version);

    const repo = new DefaultingSystemPromptRepository(
      mapper,
      buildCorpusBasePrompt(),
      ROLE_DIRECTIVES,
    );
    const base = await repo.getActive("ALL", "base");
    const directive = await repo.getActive("ANONYMOUS", "role_directive");

    const output = new SystemPromptBuilder()
      .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
      .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 })
      .build();

    expect(output).toContain("Custom admin prompt");
    expect(output).not.toContain(buildCorpusBasePrompt());
  });

  it("I3: builder falls back to hardcoded when DB has no custom prompt", async () => {
    const emptyDb = new Database(":memory:");
    ensureSchema(emptyDb);
    const mapper = new SystemPromptDataMapper(emptyDb);
    const repo = new DefaultingSystemPromptRepository(
      mapper,
      buildCorpusBasePrompt(),
      ROLE_DIRECTIVES,
    );

    const base = await repo.getActive("ALL", "base");
    const directive = await repo.getActive("AUTHENTICATED", "role_directive");

    const output = new SystemPromptBuilder()
      .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
      .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 })
      .build();

    // The seeded DB prompt comes from ensureSchema, so it should be the corpus prompt
    expect(output).toContain(buildCorpusBasePrompt());
  });

  it("I4: streaming route builder output matches manual concatenation", () => {
    const base = buildCorpusBasePrompt();
    const directive = ROLE_DIRECTIVES["AUTHENTICATED"];
    const summaryText = "User discussed pricing packages and timeline.";
    const snapshot = createConversationRoutingSnapshot({
      lane: "individual",
      confidence: 0.85,
      detectedNeedSummary: "Individual pricing inquiry",
    });
    const taskOriginBlock = "\n[Task-origin handoff context]\naction=follow_up";

    // Old manual concatenation
    const manual =
      base +
      directive +
      buildSummaryContextBlock(summaryText) +
      buildRoutingContextBlock(snapshot) +
      taskOriginBlock;

    // Builder
    const builderOutput = new SystemPromptBuilder()
      .withSection({ key: "identity", content: base, priority: 10 })
      .withSection({ key: "role_directive", content: directive, priority: 20 })
      .withConversationSummary(summaryText)
      .withRoutingContext(snapshot)
      .withSection({ key: "task_origin_handoff", content: taskOriginBlock, priority: 90 })
      .build();

    expect(builderOutput).toBe(manual);
  });
});
