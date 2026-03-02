import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/stream/route";
import { createJsonRequest } from "./helpers/request";

describe("POST /api/chat/stream", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("delegates math prompts to /api/chat", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ reply: "5" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock as never);

    const response = await POST(
      createJsonRequest("http://localhost/api/chat/stream", {
        messages: [{ role: "user", content: "what is 2 + 3" }],
      }) as never,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("/api/chat");
    expect(await response.text()).toBe("5");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns observability fields when math delegation fails", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: "upstream failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock as never);

    const response = await POST(
      createJsonRequest("http://localhost/api/chat/stream", {
        messages: [{ role: "user", content: "what is 2 + 3" }],
      }) as never,
    );

    const payload = (await response.json()) as { error: string; errorCode: string; requestId: string };

    expect(response.status).toBe(500);
    expect(payload.error).toContain("upstream failed");
    expect(payload.errorCode).toBe("INTERNAL_ERROR");
    expect(payload.requestId).toBeTruthy();
  });
});
