import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionUser,
  createRouteParams,
  createRouteRequest,
  createStaffSessionUser,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getConsultationRequestRepositoryMock,
  getTriageConsultationRequestInteractorMock,
  findByIdMock,
  triageMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getConsultationRequestRepositoryMock: vi.fn(),
  getTriageConsultationRequestInteractorMock: vi.fn(),
  findByIdMock: vi.fn(),
  triageMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getConsultationRequestRepository: getConsultationRequestRepositoryMock,
  getTriageConsultationRequestInteractor: getTriageConsultationRequestInteractorMock,
}));

import { GET, PATCH } from "./route";
import {
  ConsultationRequestNotFoundError,
  ConsultationRequestTransitionError,
} from "@/core/use-cases/TriageConsultationRequestInteractor";

function makeConsultationRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "cr_1",
    conversationId: "conv_1",
    userId: "usr_1",
    lane: "organization",
    requestSummary: "Need help scoping workflow redesign.",
    status: "pending",
    founderNote: null,
    createdAt: "2026-03-19T08:00:00.000Z",
    updatedAt: "2026-03-19T08:00:00.000Z",
    ...overrides,
  };
}

describe("/api/consultation-requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser({ name: "Admin User" }));
    getConsultationRequestRepositoryMock.mockReturnValue({
      findById: findByIdMock,
    });
    getTriageConsultationRequestInteractorMock.mockReturnValue({
      triage: triageMock,
    });
    findByIdMock.mockResolvedValue(makeConsultationRequest());
    triageMock.mockResolvedValue(makeConsultationRequest({ status: "reviewed", founderNote: "Strong fit." }));
  });

  it("returns a consultation request for admins", async () => {
    const response = await GET(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1"),
      createRouteParams("cr_1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findByIdMock).toHaveBeenCalledWith("cr_1");
    expect(body.ok).toBe(true);
    expect(body.consultationRequest.id).toBe("cr_1");
  });

  it("rejects non-admin GET callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createStaffSessionUser({ name: "Staff User" }));

    const response = await GET(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1"),
      createRouteParams("cr_1"),
    );

    expect(response.status).toBe(403);
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the consultation request is missing", async () => {
    findByIdMock.mockResolvedValueOnce(null);

    const response = await GET(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1"),
      createRouteParams("cr_missing"),
    );

    expect(response.status).toBe(404);
  });

  it("updates status for admins", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1", "PATCH", {
        status: "reviewed",
        founderNote: "Strong fit.",
      }),
      createRouteParams("cr_1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(triageMock).toHaveBeenCalledWith("admin_1", "cr_1", "reviewed", "Strong fit.");
    expect(body.consultationRequest.status).toBe("reviewed");
  });

  it("rejects invalid statuses", async () => {
    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1", "PATCH", { status: "closed" }),
      createRouteParams("cr_1"),
    );

    expect(response.status).toBe(400);
    expect(triageMock).not.toHaveBeenCalled();
  });

  it("returns 404 when triaging a missing consultation request", async () => {
    triageMock.mockRejectedValueOnce(new ConsultationRequestNotFoundError("Consultation request not found."));

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1", "PATCH", { status: "reviewed" }),
      createRouteParams("cr_missing"),
    );

    expect(response.status).toBe(404);
  });

  it("returns 422 for illegal status transitions", async () => {
    triageMock.mockRejectedValueOnce(
      new ConsultationRequestTransitionError("Illegal consultation request transition: pending -> scheduled."),
    );

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1", "PATCH", { status: "scheduled" }),
      createRouteParams("cr_1"),
    );

    expect(response.status).toBe(422);
  });

  it("rejects non-admin PATCH callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createStaffSessionUser({ name: "Staff User" }));

    const response = await PATCH(
      createRouteRequest("http://localhost:3000/api/consultation-requests/cr_1", "PATCH", { status: "reviewed" }),
      createRouteParams("cr_1"),
    );

    expect(response.status).toBe(403);
    expect(triageMock).not.toHaveBeenCalled();
  });
});