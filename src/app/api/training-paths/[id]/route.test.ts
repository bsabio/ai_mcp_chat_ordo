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
  getTrainingPathRecordRepositoryMock,
  getConversationEventRecorderMock,
  findByIdMock,
  updateMock,
  updateStatusMock,
  recordMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getTrainingPathRecordRepositoryMock: vi.fn(),
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
  getTrainingPathRecordRepository: getTrainingPathRecordRepositoryMock,
  getConversationEventRecorder: getConversationEventRecorderMock,
}));

import { GET, PATCH } from "./route";

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
    founderNote: "Internal note.",
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("/api/training-paths/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getTrainingPathRecordRepositoryMock.mockReturnValue({
      findById: findByIdMock,
      update: updateMock,
      updateStatus: updateStatusMock,
    });
    getConversationEventRecorderMock.mockReturnValue({ record: recordMock });
    findByIdMock.mockResolvedValue(makeTrainingPath());
    updateMock.mockResolvedValue(makeTrainingPath({ recommendedPath: "mentorship_sprint" }));
    updateStatusMock.mockResolvedValue(makeTrainingPath({ status: "recommended" }));
  });

  it("returns a full training path for admins", async () => {
    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trainingPath.founderNote).toBe("Internal note.");
  });

  it("returns a sanitized training path for the owner", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeTrainingPath({ status: "recommended" }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trainingPath.founderNote).toBeUndefined();
    expect(body.trainingPath.leadRecordId).toBeUndefined();
    expect(body.trainingPath.consultationRequestId).toBeUndefined();
  });

  it("hides draft training paths from their owner", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeTrainingPath({ status: "draft" }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));

    expect(response.status).toBe(404);
  });

  it("keeps approved follow-up training paths visible to their owner without founder-only fields", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());
    findByIdMock.mockResolvedValueOnce(makeTrainingPath({ status: "screening_requested" }));

    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trainingPath.status).toBe("screening_requested");
    expect(body.trainingPath.founderNote).toBeUndefined();
    expect(body.trainingPath.leadRecordId).toBeUndefined();
    expect(body.trainingPath.consultationRequestId).toBeUndefined();
  });

  it("rejects anonymous callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAnonymousSessionUser());

    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));

    expect(response.status).toBe(403);
  });

  it("rejects non-owner authenticated callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(
      createAuthenticatedSessionUser({ id: "usr_2", email: "user2@example.com", name: "User 2" }),
    );

    const response = await GET(createRouteRequest("http://localhost:3000/api/training-paths/training_1"), createRouteParams("training_1"));

    expect(response.status).toBe(403);
  });

  it("allows admins to update founder-editable fields", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/training-paths/training_1", "PATCH", { recommendedPath: "mentorship_sprint", status: "recommended" }),
      createRouteParams("training_1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith("training_1", expect.objectContaining({ recommendedPath: "mentorship_sprint" }));
    expect(updateStatusMock).toHaveBeenCalledWith("training_1", "recommended", {
      founderNote: null,
    });
    expect(recordMock).toHaveBeenCalledWith("conv_1", "training_path_status_changed", expect.objectContaining({
      fromStatus: "draft",
      toStatus: "recommended",
    }));
    expect(body.trainingPath.status).toBe("recommended");
  });

  it("rejects attempts to change lane", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/training-paths/training_1", "PATCH", { lane: "organization" }),
      createRouteParams("training_1"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects invalid recommendation values", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/training-paths/training_1", "PATCH", { recommendedPath: "unknown_offer" }),
      createRouteParams("training_1"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects illegal founder status transitions", async () => {
    findByIdMock.mockResolvedValueOnce(makeTrainingPath({ status: "closed" }));

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/training-paths/training_1", "PATCH", { status: "recommended" }),
      createRouteParams("training_1"),
    );

    expect(response.status).toBe(422);
  });

  it("rejects non-admin PATCH callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/training-paths/training_1", "PATCH", { recommendedPath: "mentorship_sprint" }),
      createRouteParams("training_1"),
    );

    expect(response.status).toBe(403);
  });
});