import { useEffect } from "react";
import type { Dispatch } from "react";
import {
  ConversationIdParser,
  EventParser,
  ErrorParser,
  JobCompletedParser,
  JobCanceledParser,
  JobFailedParser,
  JobProgressParser,
  JobQueuedParser,
  JobStartedParser,
} from "@/adapters/chat/EventParserStrategy";
import { createChatStreamProcessor } from "./chatStreamProcessor";
import type { ChatAction } from "./chatState";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";

const parser = new EventParser([
  new ConversationIdParser(),
  new JobQueuedParser(),
  new JobStartedParser(),
  new JobProgressParser(),
  new JobCompletedParser(),
  new JobCanceledParser(),
  new JobFailedParser(),
  new ErrorParser(),
]);

const processor = createChatStreamProcessor();
const MISSING_CONVERSATION_RETRY_DELAY_MS = 5_000;

interface UseChatJobEventsOptions {
  conversationId: string | null;
  dispatch: Dispatch<ChatAction>;
}

interface JobSnapshotResponse {
  jobs?: Array<{
    messageId: string;
    part: JobStatusMessagePart;
  }>;
}

async function reconcileDeferredJobs(
  conversationId: string,
  dispatch: Dispatch<ChatAction>,
): Promise<"ok" | "missing" | "error"> {
  try {
    const response = await fetch(
      `/api/chat/jobs?conversationId=${encodeURIComponent(conversationId)}&limit=12`,
      { credentials: "same-origin" },
    );

    if (response.status === 404) {
      return "missing";
    }

    if (!response.ok) {
      return "error";
    }

    const payload = await response.json() as JobSnapshotResponse;
    for (const job of payload.jobs ?? []) {
      dispatch({ type: "UPSERT_JOB_STATUS", messageId: job.messageId, part: job.part });
    }
    return "ok";
  } catch {
    // Reconciliation is best-effort and should not interrupt chat.
    return "error";
  }
}

export function useChatJobEvents({ conversationId, dispatch }: UseChatJobEventsOptions): void {
  useEffect(() => {
    if (!conversationId || typeof EventSource === "undefined") {
      return;
    }

    let missingConversationBackoffUntil = 0;

    const reconcile = async () => {
      if (Date.now() < missingConversationBackoffUntil) {
        return;
      }

      const result = await reconcileDeferredJobs(conversationId, dispatch);
      if (result === "missing") {
        missingConversationBackoffUntil = Date.now() + MISSING_CONVERSATION_RETRY_DELAY_MS;
        return;
      }

      if (result === "ok") {
        missingConversationBackoffUntil = 0;
      }
    };

    void reconcile();

    const source = new EventSource(
      `/api/chat/events?conversationId=${encodeURIComponent(conversationId)}`,
    );

    source.onmessage = (message) => {
      try {
        const raw = JSON.parse(message.data) as Record<string, unknown>;
        const event = parser.parse(raw);
        if (!event) {
          return;
        }

        processor.process(event, {
          dispatch,
          assistantIndex: -1,
        });
      } catch {
        console.warn("Invalid job event payload", message.data);
      }
    };

    source.onerror = () => {
      void reconcile();
    };

    const reconcileOnFocus = () => {
      void reconcile();
    };

    const reconcileOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void reconcile();
      }
    };

    window.addEventListener("focus", reconcileOnFocus);
    document.addEventListener("visibilitychange", reconcileOnVisibility);

    return () => {
      window.removeEventListener("focus", reconcileOnFocus);
      document.removeEventListener("visibilitychange", reconcileOnVisibility);
      source.close();
    };
  }, [conversationId, dispatch]);
}