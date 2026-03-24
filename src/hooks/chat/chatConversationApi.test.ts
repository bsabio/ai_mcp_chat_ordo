import { afterEach, describe, expect, it, vi } from "vitest";

import {
  archiveActiveConversation,
  restoreActiveConversation,
  restoreConversationById,
} from "@/hooks/chat/chatConversationApi";

describe("chatConversationApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("restores an active conversation payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            conversation: { id: "conv_1", userId: "usr_1", title: "Title", status: "active" },
            messages: [
              {
                id: "msg_1",
                role: "assistant",
                content: "Hello",
                parts: [],
                createdAt: "2026-03-20T10:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await restoreActiveConversation();

    expect(result.status).toBe("restored");
    expect(result.payload?.conversationId).toBe("conv_1");
    expect(result.payload?.messages[0]?.timestamp).toEqual(new Date("2026-03-20T10:00:00.000Z"));
  });

  it("maps 404 restores to missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    const result = await restoreConversationById("conv_missing");

    expect(result).toEqual({ status: "missing", statusCode: 404 });
  });

  it("maps aborted restores distinctly from network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );

    const result = await restoreActiveConversation();

    expect(result).toEqual({ status: "aborted" });
  });

  it("maps unexpected restore failures distinctly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );

    const result = await restoreActiveConversation();

    expect(result).toEqual({ status: "unexpected-error" });
  });

  it("returns structured archive results", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    const result = await archiveActiveConversation();

    expect(result).toEqual({ status: "archived", statusCode: 204 });
  });

  it("returns rejected for non-ok archive responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

    const result = await archiveActiveConversation();

    expect(result).toEqual({ status: "rejected", statusCode: 503 });
  });
});