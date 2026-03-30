import { MessageFactory } from "@/core/entities/MessageFactory";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { RoleName } from "@/core/entities/user";
import type { InstancePrompts } from "@/lib/config/defaults";
import { interpolateGreeting, type GreetingContext } from "@/lib/chat/greeting-interpolator";

export type ChatAction =
  | { type: "REPLACE_ALL"; messages: ChatMessage[] }
  | { type: "APPEND_TEXT"; index: number; delta: string }
  | {
      type: "APPEND_TOOL_CALL";
      index: number;
      name: string;
      args: Record<string, unknown>;
    }
  | {
      type: "APPEND_TOOL_RESULT";
      index: number;
      name: string;
      result: unknown;
    }
  | {
      type: "UPSERT_JOB_STATUS";
      part: JobStatusMessagePart;
      messageId?: string;
    }
  | { type: "SET_ERROR"; index: number; error: string };

const CHAT_BOOTSTRAP_COPY: Record<RoleName, { message: string; suggestions: string[] }> = {
  ANONYMOUS: {
    message: "Describe the workflow problem, orchestration gap, or training goal.",
    suggestions: [
      "Audit this workflow",
      "Stress-test this AI plan",
      "Train my team",
      "Show me the weak point",
    ],
  },
  AUTHENTICATED: {
    message: "Welcome back. Bring me the customer workflow, implementation question, or training decision you need help moving forward.",
    suggestions: [
      "Recommend my next step",
      "Review my active workflow",
      "Help me scope this request",
      "Turn this into a training plan",
    ],
  },
  APPRENTICE: {
    message: "Welcome back. Bring me your assignment, referral question, or training goal.",
    suggestions: [
      "Check my referral stats",
      "Help me with my assignment",
      "Review my active workflow",
      "Recommend my next step",
    ],
  },
  STAFF: {
    message: "What needs attention in the workspace right now? I can help triage service risk, review workflow quality, and prepare the next operational move.",
    suggestions: [
      "Triage service risk",
      "Review routing risk",
      "Summarize the active workflow",
      "Prepare an operator brief",
    ],
  },
  ADMIN: {
    message: "Operator console is ready. Bring me the queue, routing risk, or revenue decision that needs founder-level attention right now.",
    suggestions: [
      "Prioritize founder work",
      "Triage service risk",
      "Pick today's offer",
      "Check live market signal",
    ],
  },
};

export interface ReferralContext {
  referrerName?: string;
  referrerCredential?: string;
  brandName?: string;
}

function updateMessageAtIndex(
  state: ChatMessage[],
  index: number,
  updater: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  const message = state[index];
  if (!message) {
    return state;
  }

  const updated = [...state];
  updated[index] = updater(message);
  return updated;
}

function appendPart(message: ChatMessage, part: NonNullable<ChatMessage["parts"]>[number]): ChatMessage {
  return {
    ...message,
    parts: [...(message.parts || []), part],
  };
}

function appendTextDelta(message: ChatMessage, delta: string): ChatMessage {
  const parts = [...(message.parts || [])];
  const lastPart = parts[parts.length - 1];

  if (lastPart && lastPart.type === "text") {
    parts[parts.length - 1] = {
      ...lastPart,
      text: lastPart.text + delta,
    };
  } else {
    parts.push({ type: "text", text: delta });
  }

  return {
    ...message,
    content: (message.content || "") + delta,
    parts,
  };
}

function isJobStatusMessagePart(part: NonNullable<ChatMessage["parts"]>[number]): part is JobStatusMessagePart {
  return part.type === "job_status";
}

function upsertJobStatusMessage(
  state: ChatMessage[],
  part: JobStatusMessagePart,
  messageId?: string,
): ChatMessage[] {
  const targetIndex = state.findIndex((message) => {
    if (messageId && message.id === messageId) {
      return true;
    }

    return message.parts?.some((candidate) => isJobStatusMessagePart(candidate) && candidate.jobId === part.jobId) ?? false;
  });

  if (targetIndex >= 0) {
    return updateMessageAtIndex(state, targetIndex, (message) => ({
      ...message,
      content: "",
      timestamp: part.updatedAt ? new Date(part.updatedAt) : message.timestamp,
      parts: [
        ...(message.parts ?? []).filter((candidate) => !isJobStatusMessagePart(candidate)),
        part,
      ],
    }));
  }

  return [
    ...state,
    {
      id: messageId ?? `job_${part.jobId}`,
      role: "assistant",
      content: "",
      timestamp: part.updatedAt ? new Date(part.updatedAt) : new Date(),
      parts: [part],
    },
  ];
}

export function createInitialChatMessages(
  role: RoleName = "ANONYMOUS",
  prompts?: InstancePrompts,
  referralContext?: ReferralContext,
): ChatMessage[] {
  // When referral context is present and withReferral template exists, use referral greeting
  if (role === "ANONYMOUS" && prompts && referralContext && prompts.firstMessage?.withReferral) {
    const greetingCtx: GreetingContext = {
      referrer: {
        name: referralContext.referrerName,
        credential: referralContext.referrerCredential,
      },
      brand: { name: referralContext.brandName ?? "Studio Ordo" },
    };
    const message = interpolateGreeting(prompts.firstMessage.withReferral, greetingCtx);
    const suggestions = (prompts.referralSuggestions ?? prompts.defaultSuggestions ?? CHAT_BOOTSTRAP_COPY.ANONYMOUS.suggestions)
      .map((s) => interpolateGreeting(s, greetingCtx));
    return [MessageFactory.createHeroMessage(message, suggestions)];
  }

  if (role === "ANONYMOUS" && prompts) {
    const message =
      prompts.firstMessage?.default ??
      CHAT_BOOTSTRAP_COPY.ANONYMOUS.message;
    const suggestions =
      prompts.defaultSuggestions ??
      CHAT_BOOTSTRAP_COPY.ANONYMOUS.suggestions;
    return [MessageFactory.createHeroMessage(message, suggestions)];
  }
  const bootstrap = CHAT_BOOTSTRAP_COPY[role] ?? CHAT_BOOTSTRAP_COPY.ANONYMOUS;
  return [MessageFactory.createHeroMessage(bootstrap.message, bootstrap.suggestions)];
}

export function chatReducer(
  state: ChatMessage[],
  action: ChatAction,
): ChatMessage[] {
  switch (action.type) {
    case "REPLACE_ALL":
      return action.messages;
    case "APPEND_TEXT":
      return updateMessageAtIndex(state, action.index, (message) => appendTextDelta(message, action.delta));
    case "APPEND_TOOL_CALL":
      return updateMessageAtIndex(state, action.index, (message) => appendPart(message, {
        type: "tool_call" as const,
        name: action.name,
        args: action.args,
      }));
    case "APPEND_TOOL_RESULT":
      return updateMessageAtIndex(state, action.index, (message) => appendPart(message, {
        type: "tool_result" as const,
        name: action.name,
        result: action.result,
      }));
    case "UPSERT_JOB_STATUS":
      return upsertJobStatusMessage(state, action.part, action.messageId);
    case "SET_ERROR":
      return [
        ...state.slice(0, action.index),
        MessageFactory.createAssistantMessage(action.error),
      ];
    default:
      return state;
  }
}