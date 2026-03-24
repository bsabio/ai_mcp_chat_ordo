import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { ensureSchema } from "@/lib/db/schema";
import { LeadRecordDataMapper } from "./LeadRecordDataMapper";

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

describe("LeadRecordDataMapper", () => {
  let db: Database.Database;
  let mapper: LeadRecordDataMapper;

  beforeEach(() => {
    db = freshDb();
    mapper = new LeadRecordDataMapper(db);
    seedUser(db, "usr_1");
    seedConversation(db, { id: "conv_1", userId: "usr_1", title: "Lead conversation", lane: "development" });
  });

  it("updateQualification() persists structured qualification fields", async () => {
    const created = await mapper.submitCapture({
      conversationId: "conv_1",
      lane: "development",
      name: "Taylor",
      email: "taylor@example.com",
      organization: "Studio Ordo",
      roleOrTitle: "Engineering Manager",
      trainingGoal: null,
      problemSummary: "Need help scoping workflow automation.",
      recommendedNextAction: "Schedule a scoping call.",
    });

    const updated = await mapper.updateQualification(created.id, {
      authorityLevel: "decision_maker",
      urgency: "this_quarter",
      budgetSignal: "likely",
      technicalEnvironment: "Next.js app with internal admin workflows",
      trainingFit: "unknown",
    });

  const record = expectRecord(updated);
  expect(record.authorityLevel).toBe("decision_maker");
  expect(record.urgency).toBe("this_quarter");
  expect(record.budgetSignal).toBe("likely");
  expect(record.technicalEnvironment).toBe("Next.js app with internal admin workflows");
  expect(record.trainingFit).toBe("unknown");
  });

  it("updateQualification() preserves existing values when a field is omitted", async () => {
    const created = await mapper.submitCapture({
      conversationId: "conv_1",
      lane: "development",
      name: "Taylor",
      email: "taylor@example.com",
      organization: "Studio Ordo",
      roleOrTitle: "Engineering Manager",
      trainingGoal: null,
      problemSummary: "Need help scoping workflow automation.",
      recommendedNextAction: "Schedule a scoping call.",
    });

    await mapper.updateQualification(created.id, {
      authorityLevel: "decision_maker",
      urgency: "immediate",
      budgetSignal: "confirmed",
      technicalEnvironment: "Vercel + Postgres",
      trainingFit: "advanced",
    });

    const updated = await mapper.updateQualification(created.id, {
      urgency: "exploring",
      technicalEnvironment: "Vercel + Postgres + background jobs",
    });

  const record = expectRecord(updated);
  expect(record.authorityLevel).toBe("decision_maker");
  expect(record.urgency).toBe("exploring");
  expect(record.budgetSignal).toBe("confirmed");
  expect(record.technicalEnvironment).toBe("Vercel + Postgres + background jobs");
  expect(record.trainingFit).toBe("advanced");
  });

  it("findByConversationId() maps qualification fields from persisted rows", async () => {
    const created = await mapper.submitCapture({
      conversationId: "conv_1",
      lane: "individual",
      name: "Morgan",
      email: "morgan@example.com",
      organization: null,
      roleOrTitle: "Operator",
      trainingGoal: "Transition into AI workflow design",
      problemSummary: "Needs a structured upskilling plan.",
      recommendedNextAction: "Recommend a training path.",
    });

    await mapper.updateQualification(created.id, {
      authorityLevel: "unknown",
      urgency: "exploring",
      budgetSignal: "unclear",
      technicalEnvironment: null,
      trainingFit: "career_transition",
    });

    const found = await mapper.findByConversationId("conv_1");

  const record = expectRecord(found);
  expect(record.trainingFit).toBe("career_transition");
  expect(record.budgetSignal).toBe("unclear");
  expect(record.authorityLevel).toBe("unknown");
  });

  it("updateQualification() returns null for nonexistent id", async () => {
    const result = await mapper.updateQualification("lead_missing", {
      authorityLevel: "evaluator",
    });

    expect(result).toBeNull();
  });
});