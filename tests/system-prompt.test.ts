import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "@/lib/db/schema";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { ChatPolicyInteractor } from "@/core/use-cases/ChatPolicyInteractor";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import { ConversationEventDataMapper } from "@/adapters/ConversationEventDataMapper";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";
import { promptSet, promptRollback } from "@/lib/capabilities/shared/prompt-tool";
import type { PromptToolDeps } from "@/lib/capabilities/shared/prompt-tool";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  ensureSchema(db);
  return db;
}

describe("SystemPromptDataMapper", () => {
  let db: Database.Database;
  let repo: SystemPromptDataMapper;

  beforeEach(() => {
    db = freshDb();
    repo = new SystemPromptDataMapper(db);
  });

  it("getActive returns seeded base prompt", async () => {
    const base = await repo.getActive("ALL", "base");
    expect(base).not.toBeNull();
    expect(base!.version).toBe(1);
    expect(base!.isActive).toBe(true);
    expect(base!.content).toBe(buildCorpusBasePrompt());
  });

  it("createVersion increments version number", async () => {
    const v2 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "New base prompt v2",
      createdBy: "test_admin",
      notes: "testing version increment",
    });
    expect(v2.version).toBe(2);
    expect(v2.isActive).toBe(false);
  });

  it("activate swaps active version", async () => {
    const v2 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "New base prompt v2",
      createdBy: "test_admin",
      notes: "swap test",
    });
    await repo.activate("ALL", "base", v2.version);

    const active = await repo.getActive("ALL", "base");
    expect(active!.version).toBe(2);
    expect(active!.content).toBe("New base prompt v2");

    // Old version is no longer active
    const v1 = await repo.getByVersion("ALL", "base", 1);
    expect(v1!.isActive).toBe(false);
  });

  it("listVersions returns ordered by version desc", async () => {
    await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "v2",
      createdBy: "admin",
      notes: "",
    });
    const versions = await repo.listVersions("ALL", "base");
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0].version).toBeGreaterThan(versions[1].version);
  });

  it("getByVersion returns specific version", async () => {
    const v1 = await repo.getByVersion("ALL", "base", 1);
    expect(v1).not.toBeNull();
    expect(v1!.version).toBe(1);
  });
});

describe("ChatPolicyInteractor (DB-backed)", () => {
  let db: Database.Database;
  let repo: SystemPromptDataMapper;

  beforeEach(() => {
    db = freshDb();
    repo = new SystemPromptDataMapper(db);
  });

  it("uses DB prompt when available", async () => {
    const defaulting = new DefaultingSystemPromptRepository(repo, "FALLBACK", {});
    const interactor = new ChatPolicyInteractor(defaulting);
    const prompt = await interactor.execute({ role: "ANONYMOUS" });
    // DB has seeded prompts, so should contain the seeded base prompt, not "FALLBACK"
    expect(prompt).toContain(buildCorpusBasePrompt());
    expect(prompt).toContain("DEMO MODE");
  });

  it("falls back to hardcoded when DB has no active prompt", async () => {
    // Deactivate all prompts so fallbacks are used
    db.prepare(`UPDATE system_prompts SET is_active = 0`).run();

    const defaulting = new DefaultingSystemPromptRepository(repo, "FALLBACK_BASE", {
      ANONYMOUS: "\nFALLBACK_ANON",
    });
    const interactor = new ChatPolicyInteractor(defaulting);
    const prompt = await interactor.execute({ role: "ANONYMOUS" });
    expect(prompt).toContain("FALLBACK_BASE");
    expect(prompt).toContain("FALLBACK_ANON");
  });

  it("combines base + directive from DB", async () => {
    const defaulting = new DefaultingSystemPromptRepository(repo, "unused", {});
    const interactor = new ChatPolicyInteractor(defaulting);
    const prompt = await interactor.execute({ role: "ADMIN" });
    expect(prompt).toContain(buildCorpusBasePrompt());
    expect(prompt).toContain("SYSTEM ADMINISTRATOR");
    expect(prompt).toContain("internal operator brief");
    expect(prompt).toContain("admin_prioritize_offer");
    expect(prompt).toContain("admin_triage_routing_risk");
    expect(prompt).toContain("NOW, NEXT, WAIT");
  });

  it("uses customer-friendly directive for authenticated users", async () => {
    const defaulting = new DefaultingSystemPromptRepository(repo, "unused", {});
    const interactor = new ChatPolicyInteractor(defaulting);
    const prompt = await interactor.execute({ role: "AUTHENTICATED" });

    expect(prompt).toContain("REGISTERED USER");
    expect(prompt).toContain("customer or practitioner");
    expect(prompt).toContain("customer-friendly");
    expect(prompt).toContain("Do not fall back to marketing language");
    expect(prompt).toContain("workflow bottlenecks, implementation decisions, customer handoffs, or training outcomes");
    expect(prompt).toContain("Do not reframe the first reply as generic product strategy");
  });
});

describe("Prompt management operations", () => {
  let db: Database.Database;
  let repo: SystemPromptDataMapper;

  beforeEach(() => {
    db = freshDb();
    repo = new SystemPromptDataMapper(db);
  });

  it("list returns seeded prompts filtered by role", async () => {
    const versions = await repo.listVersions("ALL", "base");
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(versions.every((p) => p.role === "ALL")).toBe(true);
  });

  it("get returns active base prompt", async () => {
    const active = await repo.getActive("ALL", "base");
    expect(active).not.toBeNull();
    expect(active!.version).toBe(1);
    expect(active!.content).toBe(buildCorpusBasePrompt());
  });

  it("includes APPRENTICE directive coverage in seeded prompt slots", async () => {
    const apprentice = await repo.getActive("APPRENTICE", "role_directive");
    expect(apprentice).not.toBeNull();
    expect(apprentice!.version).toBe(1);
    expect(apprentice!.content).toContain("APPRENTICE (STUDENT)");
  });

  it("set creates and activates new version", async () => {
    const v2 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "New system prompt content",
      createdBy: "admin",
      notes: "testing prompt_set",
    });
    await repo.activate("ALL", "base", v2.version);

    const active = await repo.getActive("ALL", "base");
    expect(active!.version).toBe(2);
    expect(active!.content).toBe("New system prompt content");
  });

  it("rollback reactivates a previous version", async () => {
    // Create v2 and activate
    const v2 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "v2 content",
      createdBy: "admin",
      notes: "v2",
    });
    await repo.activate("ALL", "base", v2.version);
    expect((await repo.getActive("ALL", "base"))!.version).toBe(2);

    // Rollback to v1
    await repo.activate("ALL", "base", 1);
    const active = await repo.getActive("ALL", "base");
    expect(active!.version).toBe(1);
  });

  it("diff: two versions have different content", async () => {
    const v2 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "Line one\nLine two\nLine three",
      createdBy: "admin",
      notes: "v2",
    });
    const v3 = await repo.createVersion({
      role: "ALL",
      promptType: "base",
      content: "Line one\nLine modified\nLine three",
      createdBy: "admin",
      notes: "v3",
    });

    const a = await repo.getByVersion("ALL", "base", v2.version);
    const b = await repo.getByVersion("ALL", "base", v3.version);
    expect(a!.content).not.toBe(b!.content);
    expect(b!.content).toContain("Line modified");
  });
});

describe("prompt_version_changed events", () => {
  let db: Database.Database;
  let deps: PromptToolDeps;

  beforeEach(() => {
    db = freshDb();
    // Create an active conversation so events can be recorded against it
    db.prepare(
      `INSERT INTO users (id, email, name) VALUES ('usr_test', 'test@example.com', 'Test')`,
    ).run();
    db.prepare(
      `INSERT INTO conversations (id, user_id, title, status) VALUES ('conv_1', 'usr_test', 'Test', 'active')`,
    ).run();

    deps = {
      promptRepo: new SystemPromptDataMapper(db),
      eventRecorder: new ConversationEventRecorder(new ConversationEventDataMapper(db)),
      findActiveConversationIds: async () => ["conv_1"],
    };
  });

  it("prompt_set records prompt_version_changed event", async () => {
    await promptSet(deps, {
      role: "ALL",
      prompt_type: "base",
      content: "Updated prompt",
      notes: "event test",
    });

    const events = db
      .prepare(`SELECT * FROM conversation_events WHERE event_type = 'prompt_version_changed'`)
      .all() as Array<{ conversation_id: string; metadata: string }>;

    expect(events).toHaveLength(1);
    expect(events[0].conversation_id).toBe("conv_1");
    const meta = JSON.parse(events[0].metadata);
    expect(meta.role).toBe("ALL");
    expect(meta.prompt_type).toBe("base");
    expect(meta.old_version).toBe(1);
    expect(meta.new_version).toBe(2);
  });

  it("prompt_rollback records prompt_version_changed event", async () => {
    // Create v2 and activate
    await promptSet(deps, {
      role: "ALL",
      prompt_type: "base",
      content: "v2",
      notes: "setup",
    });

    // Clear events from the set call
    db.prepare(`DELETE FROM conversation_events`).run();

    // Rollback to v1
    await promptRollback(deps, {
      role: "ALL",
      prompt_type: "base",
      version: 1,
    });

    const events = db
      .prepare(`SELECT * FROM conversation_events WHERE event_type = 'prompt_version_changed'`)
      .all() as Array<{ conversation_id: string; metadata: string }>;

    expect(events).toHaveLength(1);
    const meta = JSON.parse(events[0].metadata);
    expect(meta.old_version).toBe(2);
    expect(meta.new_version).toBe(1);
  });
});
