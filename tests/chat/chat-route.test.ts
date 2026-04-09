import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/chat/route";
import { createRouteRequest } from "../helpers/workflow-route-fixture";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for empty messages", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const response = await POST(createRouteRequest("http://localhost/api/chat", "POST", { messages: [] }) as never);
    const payload = (await response.json()) as { error: string; errorCode: string; requestId: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("messages must be a non-empty array");
    expect(payload.errorCode).toBe("VALIDATION_ERROR");
    expect(payload.requestId).toBeTruthy();
  });

  it("returns 400 when no user message exists", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const response = await POST(
      createRouteRequest("http://localhost/api/chat", "POST", {
        messages: [{ role: "assistant", content: "ready" }],
      }) as never,
    );

    const payload = (await response.json()) as { error: string; errorCode: string; requestId: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("No user message found");
    expect(payload.errorCode).toBe("VALIDATION_ERROR");
    expect(payload.requestId).toBeTruthy();
  });
});
