import { afterEach, describe, expect, it, vi } from "vitest";

import {
  archiveActiveConversation,
  exportConversationById,
  importConversationFromPayload,
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

  it("hydrates interrupted assistant messages as retryable during restore", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            conversation: { id: "conv_1", userId: "usr_1", title: "Title", status: "active" },
            messages: [
              {
                id: "msg_user_1",
                role: "user",
                content: "Audit this workflow",
                parts: [
                  { type: "text", text: "Audit this workflow" },
                  {
                    type: "attachment",
                    assetId: "asset_1",
                    fileName: "brief.txt",
                    mimeType: "text/plain",
                    fileSize: 128,
                  },
                ],
                createdAt: "2026-03-20T10:00:00.000Z",
              },
              {
                id: "msg_assistant_1",
                role: "assistant",
                content: "Partial answer",
                parts: [
                  { type: "text", text: "Partial answer" },
                  {
                    type: "generation_status",
                    status: "interrupted",
                    actor: "system",
                    reason: "Connection lost during streaming.",
                    partialContentRetained: true,
                  },
                ],
                createdAt: "2026-03-20T10:00:05.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await restoreActiveConversation();

    expect(result.status).toBe("restored");
    expect(result.payload?.messages[1]).toMatchObject({
      metadata: {
        failedSend: {
          retryKey: "msg_user_1",
          failedUserMessageId: "msg_user_1",
        },
      },
    });
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

  it("parses conversation exports from exact JSON payload responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(
        JSON.stringify({
          version: 1,
          exportedAt: "2026-04-08T12:00:00.000Z",
          conversation: {
            id: "conv_1",
            title: "Exported thread",
            status: "archived",
            createdAt: "2026-04-08T10:00:00.000Z",
            updatedAt: "2026-04-08T11:00:00.000Z",
            messageCount: 1,
            sessionSource: "authenticated",
            promptVersion: null,
            routingSnapshot: { lane: "organization", confidence: 0.8 },
            referralSource: null,
          },
          messages: [],
          attachmentManifest: [],
          jobReferences: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )),
    );

    const result = await exportConversationById("conv_1");

    expect(result.status).toBe("exported");
    expect(result.payload?.conversation.id).toBe("conv_1");
  });

  it("hydrates imported conversations into a restored payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            conversation: { id: "conv_imported", userId: "usr_1", title: "Imported", status: "archived" },
            messages: [
              {
                id: "msg_1",
                role: "assistant",
                content: "Imported answer",
                parts: [{ type: "text", text: "Imported answer" }],
                createdAt: "2026-03-20T10:00:00.000Z",
              },
            ],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await importConversationFromPayload({
      version: 1,
      exportedAt: "2026-04-08T12:00:00.000Z",
      conversation: {
        id: "conv_source",
        title: "Source",
        status: "archived",
        createdAt: "2026-04-08T10:00:00.000Z",
        updatedAt: "2026-04-08T11:00:00.000Z",
        messageCount: 1,
        sessionSource: "authenticated",
        promptVersion: null,
        routingSnapshot: { lane: "organization" },
        referralSource: null,
      },
      messages: [],
      attachmentManifest: [],
      jobReferences: [],
    });

    expect(result.status).toBe("imported");
    expect(result.payload?.conversationId).toBe("conv_imported");
    expect(result.payload?.messages[0]?.timestamp).toEqual(new Date("2026-03-20T10:00:00.000Z"));
  });
});