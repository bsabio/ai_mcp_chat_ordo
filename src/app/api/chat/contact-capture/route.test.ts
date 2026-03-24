import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getLeadCaptureInteractorMock, resolveUserIdMock, submitCaptureMock } = vi.hoisted(() => ({
  getLeadCaptureInteractorMock: vi.fn(),
  resolveUserIdMock: vi.fn(),
  submitCaptureMock: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getLeadCaptureInteractor: getLeadCaptureInteractorMock,
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: resolveUserIdMock,
}));

import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/chat/contact-capture"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("POST /api/chat/contact-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserIdMock.mockResolvedValue({ userId: "usr_test", isAnonymous: false });
    getLeadCaptureInteractorMock.mockReturnValue({
      submitCapture: submitCaptureMock,
    });
    submitCaptureMock.mockResolvedValue({
      id: "lead_1",
      conversationId: "conv_1",
      lane: "development",
    });
  });

  it("accepts the development lane at the API boundary", async () => {
    const response = await POST(makeRequest({
      conversationId: "conv_1",
      lane: "development",
      name: "Alex Rivera",
      email: "alex@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      problemSummary: "Need implementation help",
      recommendedNextAction: "Offer scoping call",
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(submitCaptureMock).toHaveBeenCalledWith("usr_test", expect.objectContaining({
      conversationId: "conv_1",
      lane: "development",
    }));
    expect(payload.ok).toBe(true);
    expect(payload.leadRecord).toMatchObject({
      conversationId: "conv_1",
      lane: "development",
    });
  });

  it("rejects invalid lane values", async () => {
    const response = await POST(makeRequest({
      conversationId: "conv_1",
      lane: "enterprise",
      name: "Alex Rivera",
      email: "alex@example.com",
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("lane must be valid.");
    expect(submitCaptureMock).not.toHaveBeenCalled();
  });
});