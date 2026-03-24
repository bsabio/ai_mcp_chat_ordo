import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { ensureSchema } from "@/lib/db/schema";
import { TrainingPathRecordDataMapper } from "./TrainingPathRecordDataMapper";

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
  db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`).run(id, `${id}@example.com`, id);
}

function seedConversation(
  db: Database.Database,
  row: { id: string; userId: string; title: string; lane?: string },
) {
  db.prepare(
    `INSERT INTO conversations (id, user_id, title, status, created_at, updated_at, message_count, session_source, lane)
     VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'), 0, 'authenticated', ?)`,
  ).run(row.id, row.userId, row.title, row.lane ?? "individual");
}

function seedLeadRecord(db: Database.Database, id: string, conversationId: string) {
  db.prepare(
    `INSERT INTO lead_records (
      id, conversation_id, lane, name, email, role_or_title, training_goal, training_fit,
      problem_summary, recommended_next_action, capture_status, triage_state
     ) VALUES (?, ?, 'individual', 'Avery Stone', 'avery@example.com', 'Product designer',
      'Build operator discipline', 'career_transition',
      'Needs an operator training path.', 'Recommend an apprenticeship screen.', 'submitted', 'qualified')`,
  ).run(id, conversationId);
}

function seedConsultationRequest(db: Database.Database, id: string, conversationId: string, userId: string) {
  db.prepare(
    `INSERT INTO consultation_requests (id, conversation_id, user_id, lane, request_summary, status)
     VALUES (?, ?, ?, 'individual', 'Discuss mentorship options', 'reviewed')`,
  ).run(id, conversationId, userId);
}

describe("TrainingPathRecordDataMapper", () => {
  let db: Database.Database;
  let mapper: TrainingPathRecordDataMapper;

  beforeEach(() => {
    db = freshDb();
    mapper = new TrainingPathRecordDataMapper(db);
    seedUser(db, "usr_1");
    seedConversation(db, { id: "conv_1", userId: "usr_1", title: "Operator growth", lane: "individual" });
    seedConversation(db, { id: "conv_2", userId: "usr_1", title: "Mentorship path", lane: "individual" });
    seedLeadRecord(db, "lead_1", "conv_1");
    seedConsultationRequest(db, "cr_1", "conv_2", "usr_1");
  });

  it("create() produces a correctly shaped draft record", async () => {
    const result = await mapper.create({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      consultationRequestId: null,
      userId: "usr_1",
      currentRoleOrBackground: "Product designer",
      technicalDepth: "career_transition",
      primaryGoal: "Build operator discipline",
      preferredFormat: null,
      apprenticeshipInterest: "maybe",
      recommendedPath: "apprenticeship_screening",
      fitRationale: "Career-transition signal and explicit apprenticeship interest.",
      customerSummary: "Recommend a screening conversation before offering a full track.",
      nextAction: "Review background and send screening note.",
      founderNote: null,
    });

    expect(result.id).toMatch(/^training_/);
    expect(result.status).toBe("draft");
    expect(result.lane).toBe("individual");
    expect(result.recommendedPath).toBe("apprenticeship_screening");
  });

  it("findByLeadRecordId() returns the created record", async () => {
    const created = await mapper.create({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      consultationRequestId: null,
      userId: "usr_1",
      currentRoleOrBackground: "Product designer",
      technicalDepth: "career_transition",
      primaryGoal: "Build operator discipline",
      preferredFormat: "Weekly mentorship",
      apprenticeshipInterest: "maybe",
      recommendedPath: "mentorship_sprint",
      fitRationale: "Strong fit for guided practice first.",
      customerSummary: "Start with a four-session mentorship sprint.",
      nextAction: "Draft mentorship recommendation.",
      founderNote: null,
    });

    const found = await mapper.findByLeadRecordId("lead_1");
  const record = expectRecord(found);
  expect(record.id).toBe(created.id);
  });

  it("duplicate lead_record_id throws", async () => {
    await mapper.create({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      consultationRequestId: null,
      userId: "usr_1",
      currentRoleOrBackground: "Product designer",
      technicalDepth: "career_transition",
      primaryGoal: "Build operator discipline",
      preferredFormat: null,
      apprenticeshipInterest: "maybe",
      recommendedPath: "apprenticeship_screening",
      fitRationale: null,
      customerSummary: null,
      nextAction: null,
      founderNote: null,
    });

    await expect(
      mapper.create({
        conversationId: "conv_1",
        leadRecordId: "lead_1",
        consultationRequestId: null,
        userId: "usr_1",
        currentRoleOrBackground: "Duplicate",
        technicalDepth: null,
        primaryGoal: "Duplicate",
        preferredFormat: null,
        apprenticeshipInterest: null,
        recommendedPath: "continue_conversation",
        fitRationale: null,
        customerSummary: null,
        nextAction: null,
        founderNote: null,
      }),
    ).rejects.toThrow();
  });

  it("update() persists founder-editable fields", async () => {
    const created = await mapper.create({
      conversationId: "conv_2",
      leadRecordId: null,
      consultationRequestId: "cr_1",
      userId: "usr_1",
      currentRoleOrBackground: "Designer transitioning into AI operations",
      technicalDepth: "intermediate",
      primaryGoal: "Sharpen operator practice",
      preferredFormat: null,
      apprenticeshipInterest: "no",
      recommendedPath: "operator_lab",
      fitRationale: null,
      customerSummary: null,
      nextAction: null,
      founderNote: null,
    });

    const updated = await mapper.update(created.id, {
      preferredFormat: "Half-day intensive",
      fitRationale: "Needs structured practice rather than screening.",
      customerSummary: "Recommend the half-day operator intensive as the next step.",
      founderNote: "Follow up this week.",
    });

  const record = expectRecord(updated);
  expect(record.preferredFormat).toBe("Half-day intensive");
  expect(record.fitRationale).toBe("Needs structured practice rather than screening.");
  expect(record.customerSummary).toBe("Recommend the half-day operator intensive as the next step.");
  expect(record.founderNote).toBe("Follow up this week.");
  });

  it("updateStatus() transitions to recommended", async () => {
    const created = await mapper.create({
      conversationId: "conv_2",
      leadRecordId: null,
      consultationRequestId: "cr_1",
      userId: "usr_1",
      currentRoleOrBackground: "Designer transitioning into AI operations",
      technicalDepth: "intermediate",
      primaryGoal: "Sharpen operator practice",
      preferredFormat: null,
      apprenticeshipInterest: "no",
      recommendedPath: "operator_lab",
      fitRationale: null,
      customerSummary: null,
      nextAction: "Send operator lab recommendation.",
      founderNote: null,
    });

    const updated = await mapper.updateStatus(created.id, "recommended", {
      founderNote: "Ready for founder-approved follow-up.",
    });

  const record = expectRecord(updated);
  expect(record.status).toBe("recommended");
  expect(record.founderNote).toBe("Ready for founder-approved follow-up.");
  });

  it("findByConsultationRequestId() returns null when no record exists", async () => {
    const found = await mapper.findByConsultationRequestId("cr_missing");
    expect(found).toBeNull();
  });
});