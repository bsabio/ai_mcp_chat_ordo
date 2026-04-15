import { MessageFactory } from "@/core/entities/MessageFactory";
import type { ChatMessage, FailedSendMetadata } from "@/core/entities/chat-message";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { RoleName } from "@/core/entities/user";
import { DEFAULT_PROMPTS, type InstancePrompts } from "@/lib/config/defaults";
import { interpolateGreeting, type GreetingContext } from "@/lib/chat/greeting-interpolator";
import {
  updateMessageAtIndex,
  appendPart,
  appendTextDelta,
  replaceMessageParts,
  upsertJobStatusMessage,
  upsertGenerationStatusMessage,
  setFailedSendMetadata,
  type GenerationStatusUpdate,
} from "@/core/services/ConversationMessages";
import type { MessagePart } from "@/core/entities/message-parts";
import { replaceToolResultWithJobSnapshot } from "@/lib/media/browser-runtime/job-snapshots";

export type { GenerationStatusUpdate };

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
  | {
      type: "UPSERT_GENERATION_STATUS";
      index: number;
      generation: GenerationStatusUpdate;
    }
  | {
      type: "SET_FAILED_SEND";
      index: number;
      failedSend: FailedSendMetadata;
    }
  | {
      type: "REPLACE_MESSAGE_PARTS";
      messageId: string;
      parts: MessagePart[];
      content?: string;
    }
  | {
      type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB";
      messageId: string;
      resultIndex: number;
      part: JobStatusMessagePart;
    }
  | { type: "SET_ERROR"; index: number; error: string };

export interface ReferralContext {
  referrerName?: string;
  referrerCredential?: string;
  brandName?: string;
}

interface BootstrapCopy {
  message: string;
  suggestions: string[];
}

function getAnonymousBootstrapCopy(prompts?: InstancePrompts): BootstrapCopy {
  return {
    message:
      prompts?.firstMessage?.default
      ?? DEFAULT_PROMPTS.firstMessage?.default
      ?? "",
    suggestions:
      prompts?.defaultSuggestions
      ?? DEFAULT_PROMPTS.defaultSuggestions
      ?? [],
  };
}

function getRoleBootstrapCopy(
  role: Exclude<RoleName, "ANONYMOUS">,
  prompts?: InstancePrompts,
): BootstrapCopy {
  const configured = prompts?.roleBootstraps?.[role];
  const fallback = DEFAULT_PROMPTS.roleBootstraps?.[role];
  const anonymousFallback = getAnonymousBootstrapCopy(prompts);

  return {
    message: configured?.message ?? fallback?.message ?? anonymousFallback.message,
    suggestions: configured?.suggestions ?? fallback?.suggestions ?? anonymousFallback.suggestions,
  };
}

export function createInitialChatMessages(
  role: RoleName = "ANONYMOUS",
  prompts?: InstancePrompts,
  referralContext?: ReferralContext,
): ChatMessage[] {
  const anonymousBootstrap = getAnonymousBootstrapCopy(prompts);

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
    const suggestions = (
      prompts.referralSuggestions
      ?? DEFAULT_PROMPTS.referralSuggestions
      ?? anonymousBootstrap.suggestions
    )
      .map((s) => interpolateGreeting(s, greetingCtx));
    return [MessageFactory.createHeroMessage(message, suggestions)];
  }

  if (role === "ANONYMOUS") {
    return [
      MessageFactory.createHeroMessage(
        anonymousBootstrap.message,
        anonymousBootstrap.suggestions,
      ),
    ];
  }

  const bootstrap = getRoleBootstrapCopy(role, prompts);
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
    case "UPSERT_GENERATION_STATUS":
      return upsertGenerationStatusMessage(state, action.index, action.generation);
    case "SET_FAILED_SEND":
      return setFailedSendMetadata(state, action.index, action.failedSend);
    case "REPLACE_MESSAGE_PARTS":
      return replaceMessageParts(state, action.messageId, action.parts, action.content);
    case "REWRITE_TOOL_RESULT_AS_BROWSER_JOB":
      return replaceMessageParts(
        state,
        action.messageId,
        replaceToolResultWithJobSnapshot(
          state.find((message) => message.id === action.messageId)?.parts ?? [],
          action.messageId,
          action.resultIndex,
          action.part,
        ),
      );
    case "SET_ERROR":
      return [
        ...state.slice(0, action.index),
        MessageFactory.createAssistantMessage(action.error),
      ];
    default:
      return state;
  }
}