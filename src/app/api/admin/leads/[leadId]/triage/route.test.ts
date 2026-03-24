import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionUserMock, getLeadRecordRepositoryMock, findByIdMock, updateTriageStateMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getLeadRecordRepositoryMock: vi.fn(),
  findByIdMock: vi.fn(),
  updateTriageStateMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getLeadRecordRepository: getLeadRecordRepositoryMock,
}));

import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost:3000/api/admin/leads/lead_1/triage"), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/leads/[leadId]/triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({
      id: "usr_admin",
      email: "admin@example.com",
      name: "System Admin",
      roles: ["ADMIN"],
    });
    getLeadRecordRepositoryMock.mockReturnValue({
      findById: findByIdMock,
      updateTriageState: updateTriageStateMock,
    });
    findByIdMock.mockResolvedValue({
      id: "lead_1",
      conversationId: "conv_1",
      lane: "organization",
      name: "Alex Rivera",
      email: "alex@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      trainingGoal: null,
      problemSummary: "Needs help reducing proposal turnaround time.",
      recommendedNextAction: "Offer a founder intake call.",
      captureStatus: "submitted",
      triageState: "new",
      founderNote: null,
      lastContactedAt: null,
      createdAt: "2026-03-18T10:20:00.000Z",
      updatedAt: "2026-03-18T10:30:00.000Z",
      submittedAt: "2026-03-18T10:30:00.000Z",
      triagedAt: null,
    });
    updateTriageStateMock.mockResolvedValue({
      id: "lead_1",
      conversationId: "conv_1",
      lane: "organization",
      name: "Alex Rivera",
      email: "alex@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      trainingGoal: null,
      problemSummary: "Needs help reducing proposal turnaround time.",
      recommendedNextAction: "Offer a founder intake call.",
      captureStatus: "submitted",
      triageState: "qualified",
      founderNote: "Founder reviewed budget and timeline.",
      lastContactedAt: "2026-03-18T11:00:00.000Z",
      createdAt: "2026-03-18T10:20:00.000Z",
      updatedAt: "2026-03-18T10:40:00.000Z",
      submittedAt: "2026-03-18T10:30:00.000Z",
      triagedAt: "2026-03-18T10:40:00.000Z",
    });
  });

  it("updates founder triage state for admins", async () => {
    const response = await PATCH(makeRequest({
      triageState: "qualified",
      founderNote: "Founder reviewed budget and timeline.",
      lastContactedAt: "2026-03-18T11:00:00.000Z",
    }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(findByIdMock).toHaveBeenCalledWith("lead_1");
    expect(updateTriageStateMock).toHaveBeenCalledWith("lead_1", "qualified", {
      founderNote: "Founder reviewed budget and timeline.",
      lastContactedAt: "2026-03-18T11:00:00.000Z",
    });
    expect(payload.ok).toBe(true);
    expect(payload.leadRecord.triageState).toBe("qualified");
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce({
      id: "usr_staff",
      email: "staff@example.com",
      name: "Staff User",
      roles: ["STAFF"],
    });

    const response = await PATCH(makeRequest({ triageState: "contacted" }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(403);
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  it("rejects invalid triage states", async () => {
    const response = await PATCH(makeRequest({ triageState: "closed" }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(400);
    expect(updateTriageStateMock).not.toHaveBeenCalled();
  });

  it("rejects contacted leads without a contact timestamp", async () => {
    const response = await PATCH(makeRequest({ triageState: "contacted" }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(400);
    expect(updateTriageStateMock).not.toHaveBeenCalled();
  });

  it("rejects deferred leads without founder notes", async () => {
    const response = await PATCH(makeRequest({ triageState: "deferred", founderNote: "   " }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(400);
    expect(updateTriageStateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid contact timestamps", async () => {
    const response = await PATCH(makeRequest({
      triageState: "contacted",
      founderNote: "Reached out over email.",
      lastContactedAt: "not-a-date",
    }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(400);
    expect(updateTriageStateMock).not.toHaveBeenCalled();
  });

  it("returns not found when the lead is missing or not submitted", async () => {
    findByIdMock.mockResolvedValueOnce(null);

    const response = await PATCH(makeRequest({
      triageState: "qualified",
      founderNote: "Founder reviewed the lead.",
    }), {
      params: Promise.resolve({ leadId: "lead_1" }),
    });

    expect(response.status).toBe(404);
    expect(updateTriageStateMock).not.toHaveBeenCalled();
  });
});