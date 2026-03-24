import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteParams,
  createRouteRequest,
} from "../../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getDealRecordRepositoryMock,
  getConversationEventRecorderMock,
  findByIdMock,
  updateStatusMock,
  recordMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getDealRecordRepositoryMock: vi.fn(),
  getConversationEventRecorderMock: vi.fn(),
  findByIdMock: vi.fn(),
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

import { POST } from "./route";

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
    status: "estimate_ready",
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

describe("/api/deals/[id]/response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser());
    getDealRecordRepositoryMock.mockReturnValue({
      findById: findByIdMock,
      updateStatus: updateStatusMock,
    });
    getConversationEventRecorderMock.mockReturnValue({ record: recordMock });
    findByIdMock.mockResolvedValue(makeDeal());
    updateStatusMock.mockResolvedValue(makeDeal({ status: "agreed", customerResponseNote: "Approved." }));
  });

  it("records an owner agreement response", async () => {
    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "agreed", note: "Approved." }),
      createRouteParams("deal_1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateStatusMock).toHaveBeenCalledWith("deal_1", "agreed", {
      customerResponseNote: "Approved.",
    });
    expect(recordMock).toHaveBeenCalledWith("conv_1", "deal_customer_response_recorded", expect.objectContaining({
      toStatus: "agreed",
    }));
    expect(body.deal.status).toBe("agreed");
  });

  it("rejects anonymous callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAnonymousSessionUser());

    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "agreed" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(403);
  });

  it("rejects non-owner callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(
      createAuthenticatedSessionUser({ id: "usr_2", email: "user2@example.com", name: "User 2" }),
    );

    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "agreed" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid response values", async () => {
    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "won" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects already-final deals", async () => {
    findByIdMock.mockResolvedValueOnce(makeDeal({ status: "declined" }));

    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "agreed" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(422);
  });

  it("rejects responses before the founder makes the deal customer-visible", async () => {
    findByIdMock.mockResolvedValueOnce(makeDeal({ status: "draft" }));

    const response = await POST(
      createRouteRequest("http://localhost:3000/api/deals/deal_1/response", "POST", { response: "agreed" }),
      createRouteParams("deal_1"),
    );

    expect(response.status).toBe(422);
    expect(updateStatusMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });
});