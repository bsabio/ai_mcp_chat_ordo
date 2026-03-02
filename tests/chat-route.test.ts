import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/chat/route";
import { createJsonRequest } from "./helpers/request";

describe("POST /api/chat", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 400 for empty messages", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const response = await POST(createJsonRequest("http://localhost/api/chat", { messages: [] }) as never);
    const payload = (await response.json()) as { error: string; errorCode: string; requestId: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("messages must be a non-empty array");
    expect(payload.errorCode).toBe("VALIDATION_ERROR");
    expect(payload.requestId).toBeTruthy();
  });

  it("returns 400 when no user message exists", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const response = await POST(
      createJsonRequest("http://localhost/api/chat", {
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
