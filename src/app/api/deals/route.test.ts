import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionUser,
  createRouteRequest,
  createStaffSessionUser,
} from "../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getCreateDealFromWorkflowInteractorMock,
  createFromConsultationRequestMock,
  createFromQualifiedLeadMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getCreateDealFromWorkflowInteractorMock: vi.fn(),
  createFromConsultationRequestMock: vi.fn(),
  createFromQualifiedLeadMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getCreateDealFromWorkflowInteractor: getCreateDealFromWorkflowInteractorMock,
}));

import { POST } from "./route";
import {
  DealAlreadyExistsError,
  DealCreationEligibilityError,
  WorkflowSourceNotFoundError,
} from "@/core/use-cases/CreateDealFromWorkflowInteractor";

function makeDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal_1",
    conversationId: "conv_1",
    consultationRequestId: "cr_1",
    leadRecordId: null,
    userId: "usr_1",
    lane: "organization",
    title: "Workflow redesign advisory",
    organizationName: null,
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
    founderNote: null,
    customerResponseNote: null,
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("/api/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getCreateDealFromWorkflowInteractorMock.mockReturnValue({
      createFromConsultationRequest: createFromConsultationRequestMock,
      createFromQualifiedLead: createFromQualifiedLeadMock,
    });
    createFromConsultationRequestMock.mockResolvedValue(makeDeal());
    createFromQualifiedLeadMock.mockResolvedValue(makeDeal({ consultationRequestId: null, leadRecordId: "lead_1", lane: "development" }));
  });

  it("creates a draft deal from a consultation request", async () => {
    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { consultationRequestId: "cr_1" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createFromConsultationRequestMock).toHaveBeenCalledWith("admin_1", "cr_1");
    expect(body.deal.id).toBe("deal_1");
  });

  it("creates a draft deal from a qualified lead", async () => {
    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { leadRecordId: "lead_1" }));

    expect(response.status).toBe(201);
    expect(createFromQualifiedLeadMock).toHaveBeenCalledWith("admin_1", "lead_1");
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createStaffSessionUser());

    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { consultationRequestId: "cr_1" }));

    expect(response.status).toBe(403);
  });

  it("rejects missing or ambiguous sources", async () => {
    const noSourceResponse = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", {}));
    const ambiguousResponse = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { consultationRequestId: "cr_1", leadRecordId: "lead_1" }));

    expect(noSourceResponse.status).toBe(400);
    expect(ambiguousResponse.status).toBe(400);
  });

  it("returns 404 when the source is missing", async () => {
    createFromConsultationRequestMock.mockRejectedValueOnce(new WorkflowSourceNotFoundError("Consultation request not found."));

    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { consultationRequestId: "missing" }));

    expect(response.status).toBe(404);
  });

  it("returns 422 for ineligible sources", async () => {
    createFromQualifiedLeadMock.mockRejectedValueOnce(new DealCreationEligibilityError("Lead must be qualified before creating a deal."));

    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { leadRecordId: "lead_1" }));

    expect(response.status).toBe(422);
  });

  it("returns 409 when a deal already exists for the source", async () => {
    createFromConsultationRequestMock.mockRejectedValueOnce(new DealAlreadyExistsError("A deal already exists for this consultation request."));

    const response = await POST(createRouteRequest("http://localhost:3000/api/deals", "POST", { consultationRequestId: "cr_1" }));

    expect(response.status).toBe(409);
  });
});