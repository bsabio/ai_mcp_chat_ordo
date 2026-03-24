import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import { useState } from "react";

const { fetchStreamMock } = vi.hoisted(() => ({
  fetchStreamMock: vi.fn(),
}));

vi.mock("@/adapters/StreamProviderFactory", () => ({
  getChatStreamProvider: () => ({
    fetchStream: fetchStreamMock,
  }),
}));

import { ChatProvider, useGlobalChat } from "./useGlobalChat";

function ChatProbe() {
  const chat = useGlobalChat();

  return (
    <div>
      <div data-testid="message-count">{chat.messages.length}</div>
      <div data-testid="first-message">{chat.messages[0]?.content ?? ""}</div>
      <div data-testid="conversation-id">{chat.conversationId ?? "none"}</div>
      <div data-testid="conversation-lane">{chat.routingSnapshot?.lane ?? "none"}</div>
      <div data-testid="loading-state">{String(chat.isLoadingMessages)}</div>
      <button type="button" onClick={() => void chat.sendMessage("Send this") }>
        send
      </button>
      <button
        type="button"
        onClick={() =>
          void chat.sendMessage("Review the lead queue", [], {
            sourceBlockId: "lead_queue",
            sourceContextId: "lead-queue:header",
          })
        }
      >
        send-task-origin
      </button>
      <button
        type="button"
        onClick={() =>
          void chat.sendMessage("", [
            new File(["brief"], "brief.txt", { type: "text/plain" }),
          ])
        }
      >
        send-attachment
      </button>
    </div>
  );
}

function renderChatProvider(initialRole: "ANONYMOUS" | "AUTHENTICATED" | "STAFF" | "ADMIN" = "ANONYMOUS") {
  return render(
    <ChatProvider initialRole={initialRole}>
      <ChatProbe />
    </ChatProvider>,
  );
}

describe("ChatProvider active conversation restore", () => {
  const fetchMock = vi.fn();
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchStreamMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("refreshes the bootstrap copy when the initial role changes across a client transition", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });

    function RoleSwitcher() {
      const [role, setRole] = useState<"ANONYMOUS" | "AUTHENTICATED">("ANONYMOUS");

      return (
        <>
          <button type="button" onClick={() => setRole("AUTHENTICATED")}>switch-role</button>
          <ChatProvider initialRole={role}>
            <ChatProbe />
          </ChatProvider>
        </>
      );
    }

    render(<RoleSwitcher />);

    expect(screen.getByTestId("first-message")).toHaveTextContent("Describe the workflow problem");

    fireEvent.click(screen.getByRole("button", { name: "switch-role" }));

    await waitFor(() => {
      expect(screen.getByTestId("first-message")).toHaveTextContent("Welcome back. Bring me the customer workflow");
    });
  });

  it("seeds customer-friendly bootstrap copy for authenticated users", () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });

    renderChatProvider("AUTHENTICATED");

    expect(screen.getByTestId("first-message")).toHaveTextContent("Welcome back. Bring me the customer workflow");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Recommend my next step");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Turn this into a training plan");
  });

  it("seeds operator-focused bootstrap copy for admins", () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });

    renderChatProvider("ADMIN");

    expect(screen.getByTestId("first-message")).toHaveTextContent("Operator console is ready");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Prioritize founder work");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Check live market signal");
    expect(screen.getByTestId("first-message")).not.toHaveTextContent("Train my team");
  });

  it("hydrates messages and conversation id when an active conversation exists", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        conversation: {
          id: "conv_active",
          userId: "anon_123",
          title: "Restored",
          status: "active",
          createdAt: "2026-03-15T10:00:00.000Z",
          updatedAt: "2026-03-15T10:00:01.000Z",
          convertedFrom: null,
          messageCount: 2,
          firstMessageAt: "2026-03-15T10:00:00.000Z",
          lastToolUsed: null,
          sessionSource: "anonymous_cookie",
          promptVersion: null,
          routingSnapshot: createConversationRoutingSnapshot({
            lane: "organization",
            confidence: 0.88,
            recommendedNextStep: "Move to advisory scoping",
          }),
        },
        messages: [
          {
            id: "msg_1",
            role: "user",
            content: "Restored question",
            parts: [{ type: "text", text: "Restored question" }],
            createdAt: "2026-03-15T10:00:00.000Z",
          },
          {
            id: "msg_2",
            role: "assistant",
            content: "Restored answer",
            parts: [{ type: "text", text: "Restored answer" }],
            createdAt: "2026-03-15T10:00:01.000Z",
          },
        ],
      }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/active", undefined);
    expect(screen.getByTestId("message-count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Restored question");
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_active");
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("organization");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("restores a selected conversation when conversationId is present in the URL", async () => {
    window.history.replaceState({}, "", "/?conversationId=conv_selected");

    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        conversation: {
          id: "conv_selected",
          userId: "anon_123",
          title: "Selected thread",
          status: "archived",
          createdAt: "2026-03-15T10:00:00.000Z",
          updatedAt: "2026-03-15T10:00:01.000Z",
          convertedFrom: null,
          messageCount: 2,
          firstMessageAt: "2026-03-15T10:00:00.000Z",
          lastToolUsed: null,
          sessionSource: "anonymous_cookie",
          promptVersion: null,
          routingSnapshot: createConversationRoutingSnapshot({
            lane: "organization",
            confidence: 0.91,
            recommendedNextStep: "Resume review",
          }),
        },
        messages: [
          {
            id: "msg_selected_1",
            role: "user",
            content: "Selected question",
            parts: [{ type: "text", text: "Selected question" }],
            createdAt: "2026-03-15T10:00:00.000Z",
          },
          {
            id: "msg_selected_2",
            role: "assistant",
            content: "Selected answer",
            parts: [{ type: "text", text: "Selected answer" }],
            createdAt: "2026-03-15T10:00:01.000Z",
          },
        ],
      }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/conv_selected", undefined);
    expect(screen.getByTestId("message-count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Selected question");
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_selected");
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("organization");
    expect(window.location.search).toBe("");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps a selected conversation stable after sending a new message", async () => {
    window.history.replaceState({}, "", "/?conversationId=conv_selected");

    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          conversation: {
            id: "conv_selected",
            userId: "anon_123",
            title: "Selected thread",
            status: "archived",
            createdAt: "2026-03-15T10:00:00.000Z",
            updatedAt: "2026-03-15T10:00:01.000Z",
            convertedFrom: null,
            messageCount: 2,
            firstMessageAt: "2026-03-15T10:00:00.000Z",
            lastToolUsed: null,
            sessionSource: "anonymous_cookie",
            promptVersion: null,
            routingSnapshot: createConversationRoutingSnapshot({
              lane: "organization",
              confidence: 0.91,
              recommendedNextStep: "Resume review",
            }),
          },
          messages: [
            {
              id: "msg_selected_1",
              role: "user",
              content: "Selected question",
              parts: [{ type: "text", text: "Selected question" }],
              createdAt: "2026-03-15T10:00:00.000Z",
            },
            {
              id: "msg_selected_2",
              role: "assistant",
              content: "Selected answer",
              parts: [{ type: "text", text: "Selected answer" }],
              createdAt: "2026-03-15T10:00:01.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          conversation: {
            id: "conv_selected",
            userId: "anon_123",
            title: "Selected thread",
            status: "archived",
            createdAt: "2026-03-15T10:00:00.000Z",
            updatedAt: "2026-03-18T10:00:01.000Z",
            convertedFrom: null,
            messageCount: 4,
            firstMessageAt: "2026-03-15T10:00:00.000Z",
            lastToolUsed: null,
            sessionSource: "anonymous_cookie",
            promptVersion: null,
            routingSnapshot: createConversationRoutingSnapshot({
              lane: "organization",
              confidence: 0.92,
              recommendedNextStep: "Resume review",
            }),
          },
          messages: [
            {
              id: "msg_selected_1",
              role: "user",
              content: "Selected question",
              parts: [{ type: "text", text: "Selected question" }],
              createdAt: "2026-03-15T10:00:00.000Z",
            },
            {
              id: "msg_selected_2",
              role: "assistant",
              content: "Selected answer",
              parts: [{ type: "text", text: "Selected answer" }],
              createdAt: "2026-03-15T10:00:01.000Z",
            },
            {
              id: "msg_selected_3",
              role: "user",
              content: "Send this",
              parts: [{ type: "text", text: "Send this" }],
              createdAt: "2026-03-18T10:00:00.000Z",
            },
            {
              id: "msg_selected_4",
              role: "assistant",
              content: "Thread-specific reply",
              parts: [{ type: "text", text: "Thread-specific reply" }],
              createdAt: "2026-03-18T10:00:01.000Z",
            },
          ],
        }),
      });

    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "text", delta: "Thread-specific reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_selected");
    });

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Send this" }),
        ]),
        expect.objectContaining({
          conversationId: "conv_selected",
          attachments: [],
        }),
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/conversations/conv_selected", undefined);
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_selected");
      expect(screen.getByTestId("message-count")).toHaveTextContent("4");
    });
  });

  it("falls back to the active conversation endpoint when a newly created thread is not yet restorable by id", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "Conversation not found" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          conversation: {
            id: "conv_new",
            userId: "anon_123",
            title: "Fresh thread",
            status: "active",
            createdAt: "2026-03-18T10:00:00.000Z",
            updatedAt: "2026-03-18T10:00:01.000Z",
            convertedFrom: null,
            messageCount: 2,
            firstMessageAt: "2026-03-18T10:00:00.000Z",
            lastToolUsed: null,
            sessionSource: "anonymous_cookie",
            promptVersion: null,
            routingSnapshot: createConversationRoutingSnapshot({
              lane: "individual",
              confidence: 0.89,
              recommendedNextStep: "Continue the new thread",
            }),
          },
          messages: [
            {
              id: "msg_new_1",
              role: "user",
              content: "Send this",
              parts: [{ type: "text", text: "Send this" }],
              createdAt: "2026-03-18T10:00:00.000Z",
            },
            {
              id: "msg_new_2",
              role: "assistant",
              content: "Fresh reply",
              parts: [{ type: "text", text: "Fresh reply" }],
              createdAt: "2026-03-18T10:00:01.000Z",
            },
          ],
        }),
      });

    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_new" };
        yield { type: "text", delta: "Fresh reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/conversations/conv_new", undefined);
      expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/conversations/active", undefined);
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_new");
      expect(screen.getByTestId("message-count")).toHaveTextContent("2");
    });
  });

  it("keeps the hero state when no active conversation exists", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("none");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("warns and keeps the hero state when restore unexpectedly returns 401", async () => {
    fetchMock.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: "Authentication required" }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("none");
    expect(warnSpy).toHaveBeenCalledWith(
      "Active conversation restore unexpectedly required authentication.",
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps the hero state on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("none");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Unexpected failure while restoring active conversation.",
    );
  });

  it("streams an assistant reply through the public sendMessage API", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        conversation: {
          id: "conv_new",
          userId: "anon_123",
          title: "Send this",
          status: "active",
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-18T10:00:01.000Z",
          convertedFrom: null,
          messageCount: 2,
          firstMessageAt: "2026-03-18T10:00:00.000Z",
          lastToolUsed: null,
          sessionSource: "anonymous_cookie",
          promptVersion: null,
          routingSnapshot: createConversationRoutingSnapshot({ lane: "individual", confidence: 0.78 }),
        },
        messages: [
          {
            id: "msg_1",
            role: "user",
            content: "Send this",
            parts: [{ type: "text", text: "Send this" }],
            createdAt: "2026-03-18T10:00:00.000Z",
          },
          {
            id: "msg_2",
            role: "assistant",
            content: "Assistant reply",
            parts: [{ type: "text", text: "Assistant reply" }],
            createdAt: "2026-03-18T10:00:01.000Z",
          },
        ],
      }),
      });
    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_new" };
        yield { type: "text", delta: "Assistant reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Send this" }),
        ]),
        expect.objectContaining({ attachments: [] }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_new");
      expect(screen.getByTestId("message-count")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("conversation-lane")).toHaveTextContent("individual");
  });

  it("forwards task-origin handoff metadata through the public sendMessage API", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          conversation: {
            id: "conv_task_origin",
            userId: "anon_123",
            title: "Review the lead queue",
            status: "active",
            createdAt: "2026-03-18T10:00:00.000Z",
            updatedAt: "2026-03-18T10:00:01.000Z",
            convertedFrom: null,
            messageCount: 2,
            firstMessageAt: "2026-03-18T10:00:00.000Z",
            lastToolUsed: null,
            sessionSource: "anonymous_cookie",
            promptVersion: null,
            routingSnapshot: createConversationRoutingSnapshot({ lane: "organization", confidence: 0.86 }),
          },
          messages: [
            {
              id: "msg_1",
              role: "user",
              content: "Review the lead queue",
              parts: [{ type: "text", text: "Review the lead queue" }],
              createdAt: "2026-03-18T10:00:00.000Z",
            },
            {
              id: "msg_2",
              role: "assistant",
              content: "Lead-focused reply",
              parts: [{ type: "text", text: "Lead-focused reply" }],
              createdAt: "2026-03-18T10:00:01.000Z",
            },
          ],
        }),
      });
    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_task_origin" };
        yield { type: "text", delta: "Lead-focused reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-task-origin" }));

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Review the lead queue" }),
        ]),
        expect.objectContaining({
          attachments: [],
          taskOriginHandoff: {
            sourceBlockId: "lead_queue",
            sourceContextId: "lead-queue:header",
          },
        }),
      );
    });
  });

  it("uploads attachments before streaming the message", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          attachments: [
            {
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        }),
      });

    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_upload" };
        yield { type: "text", delta: "Uploaded reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: "",
          }),
        ]),
        {
          conversationId: undefined,
          attachments: [
            {
              type: "attachment",
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        },
      );
    });
  });

  it("does not start streaming when attachment upload fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Upload failed" }),
      });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(fetchStreamMock).not.toHaveBeenCalled();
  });

  it("requests attachment cleanup when streaming fails after upload", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          attachments: [
            {
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deletedIds: ["uf_attachment"] }),
      });

    fetchStreamMock.mockRejectedValue(new Error("stream down"));

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/chat/uploads",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ attachmentIds: ["uf_attachment"] }),
        }),
      );
    });
  });
});