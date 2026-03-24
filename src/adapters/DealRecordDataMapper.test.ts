import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { ensureSchema } from "@/lib/db/schema";
import { DealRecordDataMapper } from "./DealRecordDataMapper";

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
  ).run(row.id, row.userId, row.title, row.lane ?? "organization");
}

function seedConsultationRequest(db: Database.Database, id: string, conversationId: string, userId: string) {
  db.prepare(
    `INSERT INTO consultation_requests (id, conversation_id, user_id, lane, request_summary, status)
     VALUES (?, ?, ?, 'organization', 'Need workflow redesign help', 'reviewed')`,
  ).run(id, conversationId, userId);
}

function seedLeadRecord(db: Database.Database, id: string, conversationId: string) {
  db.prepare(
    `INSERT INTO lead_records (
      id, conversation_id, lane, name, email, organization, problem_summary, recommended_next_action, capture_status, triage_state
     ) VALUES (?, ?, 'organization', 'Alex Rivera', 'alex@example.com', 'Northwind Labs', 'Proposal operations are too slow.', 'Draft a scoped offer.', 'submitted', 'qualified')`,
  ).run(id, conversationId);
}

describe("DealRecordDataMapper", () => {
  let db: Database.Database;
  let mapper: DealRecordDataMapper;

  beforeEach(() => {
    db = freshDb();
    mapper = new DealRecordDataMapper(db);
    seedUser(db, "usr_1");
    seedConversation(db, { id: "conv_1", userId: "usr_1", title: "Workflow redesign", lane: "organization" });
    seedConversation(db, { id: "conv_2", userId: "usr_1", title: "Automation delivery", lane: "development" });
    seedConsultationRequest(db, "cr_1", "conv_1", "usr_1");
    seedLeadRecord(db, "lead_1", "conv_2");
  });

  it("create() produces a correctly shaped draft record", async () => {
    const result = await mapper.create({
      conversationId: "conv_1",
      consultationRequestId: "cr_1",
      leadRecordId: null,
      userId: "usr_1",
      lane: "organization",
      title: "Northwind workflow redesign",
      organizationName: "Northwind Labs",
      problemSummary: "Proposal operations are too slow.",
      proposedScope: "Discovery and redesign sprint.",
      recommendedServiceType: "consulting",
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      nextAction: "Review draft with founder.",
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    expect(result.id).toMatch(/^deal_/);
    expect(result.status).toBe("draft");
    expect(result.consultationRequestId).toBe("cr_1");
    expect(result.lane).toBe("organization");
    expect(result.title).toBe("Northwind workflow redesign");
  });

  it("findByConsultationRequestId() returns the created record", async () => {
    const created = await mapper.create({
      conversationId: "conv_1",
      consultationRequestId: "cr_1",
      leadRecordId: null,
      userId: "usr_1",
      lane: "organization",
      title: "Northwind workflow redesign",
      organizationName: "Northwind Labs",
      problemSummary: "Proposal operations are too slow.",
      proposedScope: "Discovery and redesign sprint.",
      recommendedServiceType: "consulting",
      estimatedHours: 8,
      estimatedTrainingDays: null,
      estimatedPrice: 2400,
      nextAction: "Send draft summary.",
      assumptions: "Stakeholder access will be available.",
      openQuestions: "Who owns procurement?",
      founderNote: null,
      customerResponseNote: null,
    });

    const found = await mapper.findByConsultationRequestId("cr_1");
  const record = expectRecord(found);
  expect(record.id).toBe(created.id);
  });

  it("duplicate consultation_request_id throws", async () => {
    await mapper.create({
      conversationId: "conv_1",
      consultationRequestId: "cr_1",
      leadRecordId: null,
      userId: "usr_1",
      lane: "organization",
      title: "Northwind workflow redesign",
      organizationName: "Northwind Labs",
      problemSummary: "Proposal operations are too slow.",
      proposedScope: "Discovery and redesign sprint.",
      recommendedServiceType: "consulting",
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      nextAction: null,
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    await expect(
      mapper.create({
        conversationId: "conv_1",
        consultationRequestId: "cr_1",
        leadRecordId: null,
        userId: "usr_1",
        lane: "organization",
        title: "Duplicate deal",
        organizationName: "Northwind Labs",
        problemSummary: "Duplicate",
        proposedScope: "Duplicate",
        recommendedServiceType: "consulting",
        estimatedHours: null,
        estimatedTrainingDays: null,
        estimatedPrice: null,
        nextAction: null,
        assumptions: null,
        openQuestions: null,
        founderNote: null,
        customerResponseNote: null,
      }),
    ).rejects.toThrow();
  });

  it("update() persists founder-editable fields", async () => {
    const created = await mapper.create({
      conversationId: "conv_2",
      consultationRequestId: null,
      leadRecordId: "lead_1",
      userId: "usr_1",
      lane: "development",
      title: "Automation delivery",
      organizationName: "Northwind Labs",
      problemSummary: "Need platform automation help.",
      proposedScope: "Initial scoping.",
      recommendedServiceType: "delivery",
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      nextAction: null,
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    const updated = await mapper.update(created.id, {
      proposedScope: "Implementation sprint plus rollout support.",
      estimatedHours: 24,
      estimatedPrice: 7200,
      founderNote: "High-fit delivery lead.",
    });

  const record = expectRecord(updated);
  expect(record.proposedScope).toBe("Implementation sprint plus rollout support.");
  expect(record.estimatedHours).toBe(24);
  expect(record.estimatedPrice).toBe(7200);
  expect(record.founderNote).toBe("High-fit delivery lead.");
  });

  it("updateStatus() transitions to agreed", async () => {
    const created = await mapper.create({
      conversationId: "conv_2",
      consultationRequestId: null,
      leadRecordId: "lead_1",
      userId: "usr_1",
      lane: "development",
      title: "Automation delivery",
      organizationName: "Northwind Labs",
      problemSummary: "Need platform automation help.",
      proposedScope: "Initial scoping.",
      recommendedServiceType: "delivery",
      estimatedHours: 24,
      estimatedTrainingDays: null,
      estimatedPrice: 7200,
      nextAction: "Review scope and confirm.",
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    const updated = await mapper.updateStatus(created.id, "agreed", {
      customerResponseNote: "Ready to move ahead.",
    });

  const record = expectRecord(updated);
  expect(record.status).toBe("agreed");
  expect(record.customerResponseNote).toBe("Ready to move ahead.");
  });

  it("findByLeadRecordId() returns null when no record exists", async () => {
    const found = await mapper.findByLeadRecordId("lead_missing");
    expect(found).toBeNull();
  });
});