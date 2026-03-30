import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureSchema } from "@/lib/db/schema";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedConversation(db: Database.Database, conversationId = "conv_jobs") {
  db.prepare(`INSERT INTO users (id, email, name) VALUES ('usr_test', 'test@example.com', 'Test User')`).run();
  db.prepare(`INSERT INTO conversations (id, user_id, title, status, session_source) VALUES (?, 'usr_test', 'Jobs', 'active', 'authenticated')`).run(conversationId);
}

describe("deferred job schema", () => {
  it("creates job_requests with Sprint 0 fields", () => {
    const db = createDb();
    const columns = db.pragma("table_info(job_requests)") as Array<{ name: string; notnull: number }>;
    const names = columns.map((column) => column.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "conversation_id",
        "user_id",
        "tool_name",
        "status",
        "dedupe_key",
        "initiator_type",
        "request_payload_json",
        "lease_expires_at",
        "claimed_by",
      ]),
    );

    expect(columns.find((column) => column.name === "user_id")?.notnull).toBe(0);
  });

  it("creates job_events with a durable sequence cursor", () => {
    const db = createDb();
    const columns = db.pragma("table_info(job_events)") as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain("sequence");
  });

  it("enforces unique conversation-scoped event sequences", () => {
    const db = createDb();
    seedConversation(db);

    db.prepare(
      `INSERT INTO job_requests (id, conversation_id, tool_name, status, initiator_type, request_payload_json)
       VALUES ('job_1', 'conv_jobs', 'draft_content', 'queued', 'system', '{}')`,
    ).run();

    db.prepare(
      `INSERT INTO job_events (id, job_id, conversation_id, sequence, event_type, event_payload_json)
       VALUES ('evt_1', 'job_1', 'conv_jobs', 1, 'queued', '{}')`,
    ).run();

    expect(() =>
      db.prepare(
        `INSERT INTO job_events (id, job_id, conversation_id, sequence, event_type, event_payload_json)
         VALUES ('evt_2', 'job_1', 'conv_jobs', 1, 'progress', '{}')`,
      ).run(),
    ).toThrow();
  });
});
