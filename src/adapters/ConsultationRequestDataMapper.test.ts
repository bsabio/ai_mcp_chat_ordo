import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { ensureSchema } from "@/lib/db/schema";
import { ConsultationRequestDataMapper } from "./ConsultationRequestDataMapper";

function expectRecord<T>(value: T | null): T {
  expect(value).not.toBeNull();
  if (value === null) {
    throw new Error("Expected record to be present.");
  }

  return value;
}

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database, id: string) {
  db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`)
    .run(id, `${id}@example.com`, id);
}

function seedConversation(
  db: Database.Database,
  row: { id: string; userId: string; title: string; lane?: string },
) {
  db.prepare(
    `INSERT INTO conversations (id, user_id, title, status, created_at, updated_at, message_count, session_source, lane)
     VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'), 0, 'authenticated', ?)`,
  ).run(row.id, row.userId, row.title, row.lane ?? "uncertain");
}

describe("ConsultationRequestDataMapper", () => {
  let db: Database.Database;
  let mapper: ConsultationRequestDataMapper;

  beforeEach(() => {
    db = freshDb();
    mapper = new ConsultationRequestDataMapper(db);
    seedUser(db, "usr_1");
    seedConversation(db, { id: "conv_1", userId: "usr_1", title: "Test conversation", lane: "organization" });
  });

  it("create() produces a correctly shaped record", async () => {
    const result = await mapper.create({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "Need workflow redesign help",
    });

    expect(result.id).toMatch(/^cr_/);
    expect(result.conversationId).toBe("conv_1");
    expect(result.userId).toBe("usr_1");
    expect(result.lane).toBe("organization");
    expect(result.requestSummary).toBe("Need workflow redesign help");
    expect(result.status).toBe("pending");
    expect(result.founderNote).toBeNull();
    expect(result.createdAt).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
  });

  it("findByConversationId() returns null when no request exists", async () => {
    const result = await mapper.findByConversationId("conv_1");
    expect(result).toBeNull();
  });

  it("findByConversationId() returns the created record", async () => {
    const created = await mapper.create({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "Help needed",
    });

    const found = await mapper.findByConversationId("conv_1");
  const record = expectRecord(found);
  expect(record.id).toBe(created.id);
  expect(record.requestSummary).toBe("Help needed");
  });

  it("duplicate conversation_id throws", async () => {
    await mapper.create({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "First request",
    });

    await expect(
      mapper.create({
        conversationId: "conv_1",
        userId: "usr_1",
        lane: "organization",
        requestSummary: "Second request",
      }),
    ).rejects.toThrow();
  });

  it("updateStatus() transitions from pending to reviewed", async () => {
    const created = await mapper.create({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "Review me",
    });

    const updated = await mapper.updateStatus(created.id, "reviewed", {
      founderNote: "Looks promising",
    });

  const record = expectRecord(updated);
  expect(record.status).toBe("reviewed");
  expect(record.founderNote).toBe("Looks promising");
  });

  it("listByStatus() returns matching records", async () => {
    await mapper.create({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "Pending request",
    });

    const pending = await mapper.listByStatus("pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");

    const reviewed = await mapper.listByStatus("reviewed");
    expect(reviewed).toHaveLength(0);
  });

  it("findById() returns null for nonexistent id", async () => {
    const result = await mapper.findById("cr_nonexistent");
    expect(result).toBeNull();
  });

  it("updateStatus() returns null for nonexistent id", async () => {
    const result = await mapper.updateStatus("cr_nonexistent", "reviewed");
    expect(result).toBeNull();
  });
});
