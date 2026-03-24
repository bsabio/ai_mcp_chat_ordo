import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest } from "../../../../tests/helpers/request";

const {
  getSessionUserMock,
  getRequestConsultationInteractorMock,
  requestConsultationMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getRequestConsultationInteractorMock: vi.fn(),
  requestConsultationMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getRequestConsultationInteractor: getRequestConsultationInteractorMock,
}));

import { POST } from "./route";
import {
  ConsultationRequestError,
  DuplicateConsultationRequestError,
} from "@/core/use-cases/RequestConsultationInteractor";

function authenticatedUser() {
  return {
    id: "usr_auth",
    email: "test@example.com",
    name: "Test User",
    roles: ["AUTHENTICATED"],
  };
}

function anonymousUser() {
  return {
    id: "usr_anonymous",
    email: "anonymous@example.com",
    name: "Anonymous User",
    roles: ["ANONYMOUS"],
  };
}

const validPayload = {
  conversationId: "conv_1",
  requestSummary: "I need help scoping an internal workflow redesign.",
};

const mockConsultationRequest = {
  id: "cr_abc123",
  conversationId: "conv_1",
  userId: "usr_auth",
  lane: "organization",
  requestSummary: "I need help scoping an internal workflow redesign.",
  status: "pending",
  founderNote: null,
  createdAt: "2026-03-18T10:00:00.000Z",
  updatedAt: "2026-03-18T10:00:00.000Z",
};

describe("POST /api/consultation-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(authenticatedUser());
    requestConsultationMock.mockResolvedValue(mockConsultationRequest);
    getRequestConsultationInteractorMock.mockReturnValue({
      requestConsultation: requestConsultationMock,
    });
  });

  it("returns 201 with a consultation request record on valid request", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", validPayload) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.consultationRequest).toMatchObject({
      id: "cr_abc123",
      status: "pending",
    });
    expect(requestConsultationMock).toHaveBeenCalledWith(
      "usr_auth",
      "conv_1",
      "I need help scoping an internal workflow redesign.",
    );
  });

  it("returns 403 for anonymous user", async () => {
    getSessionUserMock.mockResolvedValue(anonymousUser());

    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", validPayload) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(403);
    expect(body.error).toBe("Authentication required.");
  });

  it("returns 400 for missing conversationId", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", {
        requestSummary: "Help",
      }) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.error).toBe("conversationId is required.");
  });

  it("returns 400 for missing requestSummary", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", {
        conversationId: "conv_1",
      }) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.error).toBe("requestSummary is required.");
  });

  it("returns 403 for non-owned conversation", async () => {
    requestConsultationMock.mockRejectedValue(
      new ConsultationRequestError("Conversation not found or not owned by user."),
    );

    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", validPayload) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(403);
    expect(body.error).toContain("not owned by user");
  });

  it("returns 409 for duplicate request", async () => {
    requestConsultationMock.mockRejectedValue(
      new DuplicateConsultationRequestError(
        "A consultation request already exists for this conversation.",
      ),
    );

    const response = await POST(
      createJsonRequest("http://localhost/api/consultation-requests", validPayload) as never,
    );

    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(409);
    expect(body.error).toContain("already exists");
  });
});
