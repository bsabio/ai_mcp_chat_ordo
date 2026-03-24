import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionUser,
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteParams,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getDealRecordRepositoryMock,
  getConversationEventRecorderMock,
  findByIdMock,
  updateMock,
  updateStatusMock,
  recordMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getDealRecordRepositoryMock: vi.fn(),
  getConversationEventRecorderMock: vi.fn(),
  findByIdMock: vi.fn(),
  updateMock: vi.fn(),
  updateStatusMock: vi.fn(),
  recordMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getDealRecordRepository: getDealRecordRepositoryMock,
  getConversationEventRecorder: getConversationEventRecorderMock,
}));

import { GET, PATCH } from "./route";

function makeDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal_1",
    conversationId: "conv_1",
    consultationRequestId: "cr_1",
    leadRecordId: null,
    userId: "usr_1",
    lane: "organization",
    title: "Workflow redesign advisory",
    organizationName: "Northwind Labs",
    problemSummary: "Need help redesigning approvals.",
    proposedScope: "",
    recommendedServiceType: "advisory",
    estimatedHours: null,
    estimatedTrainingDays: null,
    estimatedPrice: null,
    status: "draft",
    nextAction: "Review the request and prepare the founder follow-up plan.",
    assumptions: null,
    openQuestions: null,
    founderNote: "Internal note.",
    customerResponseNote: null,
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("/api/deals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getDealRecordRepositoryMock.mockReturnValue({
      findById: findByIdMock,
      update: updateMock,
      updateStatus: updateStatusMock,
    });
    getConversationEventRecorderMock.mockReturnValue({ record: recordMock });
    findByIdMock.mockResolvedValue(makeDeal());
    updateMock.mockResolvedValue(makeDeal({ title: "Updated deal" }));
    updateStatusMock.mockResolvedValue(makeDeal({ title: "Updated deal", status: "qualified" }));
  });

  it("returns a full deal for admins", async () => {
    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal.founderNote).toBe("Internal note.");
  });

  it("returns a sanitized deal for the owner", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeDeal({ status: "estimate_ready" }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal.founderNote).toBeUndefined();
    expect(body.deal.consultationRequestId).toBeUndefined();
    expect(body.deal.leadRecordId).toBeUndefined();
  });

  it("hides unapproved deals from their owner", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeDeal({ status: "draft" }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));

    expect(response.status).toBe(404);
  });

  it("keeps finalized approved deals visible to their owner without founder-only fields", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeDeal({ status: "agreed", customerResponseNote: "Looks good." }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal.status).toBe("agreed");
    expect(body.deal.customerResponseNote).toBe("Looks good.");
    expect(body.deal.founderNote).toBeUndefined();
    expect(body.deal.consultationRequestId).toBeUndefined();
    expect(body.deal.leadRecordId).toBeUndefined();
  });

  it("rejects anonymous callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAnonymousSessionUser());

    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));

    expect(response.status).toBe(403);
  });

  it("rejects non-owner authenticated callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(
      createAuthenticatedSessionUser({ id: "usr_2", email: "user2@example.com", name: "User 2" }),
    );

    const response = await GET(createRouteRequest("http://localhost:3000/api/deals/deal_1"), createRouteParams("deal_1"));

    expect(response.status).toBe(403);
  });

  it("allows admins to update founder-editable fields", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/deals/deal_1", "PATCH", { title: "Updated deal", status: "qualified" }),
      createRouteParams("deal_1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith("deal_1", expect.objectContaining({ title: "Updated deal" }));
    expect(updateStatusMock).toHaveBeenCalledWith("deal_1", "qualified", {
      founderNote: null,
      customerResponseNote: null,
    });
    expect(recordMock).toHaveBeenCalledWith("conv_1", "deal_status_changed", expect.objectContaining({
      fromStatus: "draft",
      toStatus: "qualified",
    }));
    expect(body.deal.status).toBe("qualified");
  });

  it("rejects attempts to change lane", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/deals/deal_1", "PATCH", { lane: "individual" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects customer response statuses on the founder route", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/deals/deal_1", "PATCH", { status: "agreed" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects invalid numeric estimate fields instead of silently dropping them", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/deals/deal_1", "PATCH", { estimatedPrice: "6000" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin PATCH callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/deals/deal_1", "PATCH", { title: "Updated deal" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(403);
  });
});