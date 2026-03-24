import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionUser,
  createRouteRequest,
  createStaffSessionUser,
} from "../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getCreateTrainingPathFromWorkflowInteractorMock,
  createFromConsultationRequestMock,
  createFromQualifiedLeadMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getCreateTrainingPathFromWorkflowInteractorMock: vi.fn(),
  createFromConsultationRequestMock: vi.fn(),
  createFromQualifiedLeadMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getCreateTrainingPathFromWorkflowInteractor: getCreateTrainingPathFromWorkflowInteractorMock,
}));

import { POST } from "./route";
import {
  TrainingPathAlreadyExistsError,
  TrainingPathCreationEligibilityError,
  WorkflowSourceNotFoundError,
} from "@/core/use-cases/CreateTrainingPathFromWorkflowInteractor";

function makeTrainingPath(overrides: Record<string, unknown> = {}) {
  return {
    id: "training_1",
    conversationId: "conv_1",
    leadRecordId: "lead_1",
    consultationRequestId: null,
    userId: "usr_1",
    lane: "individual",
    currentRoleOrBackground: "Product designer",
    technicalDepth: "career_transition",
    primaryGoal: "Build operator discipline",
    preferredFormat: null,
    apprenticeshipInterest: "maybe",
    recommendedPath: "apprenticeship_screening",
    fitRationale: "Career transition and apprenticeship interest.",
    customerSummary: "Recommend an apprenticeship screening conversation before offering a deeper track.",
    status: "draft",
    nextAction: "Review fit and prepare the apprenticeship screening follow-up.",
    founderNote: null,
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("/api/training-paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getCreateTrainingPathFromWorkflowInteractorMock.mockReturnValue({
      createFromConsultationRequest: createFromConsultationRequestMock,
      createFromQualifiedLead: createFromQualifiedLeadMock,
    });
    createFromConsultationRequestMock.mockResolvedValue(makeTrainingPath({ leadRecordId: null, consultationRequestId: "cr_1" }));
    createFromQualifiedLeadMock.mockResolvedValue(makeTrainingPath());
  });

  it("creates a draft training path from a consultation request", async () => {
    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { consultationRequestId: "cr_1" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createFromConsultationRequestMock).toHaveBeenCalledWith("admin_1", "cr_1");
    expect(body.trainingPath.id).toBe("training_1");
  });

  it("creates a draft training path from a qualified lead", async () => {
    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { leadRecordId: "lead_1" }));

    expect(response.status).toBe(201);
    expect(createFromQualifiedLeadMock).toHaveBeenCalledWith("admin_1", "lead_1");
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createStaffSessionUser());

    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { consultationRequestId: "cr_1" }));

    expect(response.status).toBe(403);
  });

  it("rejects missing or ambiguous sources", async () => {
    const noSourceResponse = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", {}));
    const ambiguousResponse = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { consultationRequestId: "cr_1", leadRecordId: "lead_1" }));

    expect(noSourceResponse.status).toBe(400);
    expect(ambiguousResponse.status).toBe(400);
  });

  it("returns 404 when the source is missing", async () => {
    createFromConsultationRequestMock.mockRejectedValueOnce(new WorkflowSourceNotFoundError("Consultation request not found."));

    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { consultationRequestId: "missing" }));

    expect(response.status).toBe(404);
  });

  it("returns 422 for ineligible sources", async () => {
    createFromQualifiedLeadMock.mockRejectedValueOnce(
      new TrainingPathCreationEligibilityError("Lead must be qualified before creating a training path."),
    );

    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { leadRecordId: "lead_1" }));

    expect(response.status).toBe(422);
  });

  it("returns 409 when a training path already exists for the source", async () => {
    createFromConsultationRequestMock.mockRejectedValueOnce(
      new TrainingPathAlreadyExistsError("A training path already exists for this consultation request."),
    );

    const response = await POST(createRouteRequest("http://localhost:3000/api/training-paths", "POST", { consultationRequestId: "cr_1" }));

    expect(response.status).toBe(409);
  });
});