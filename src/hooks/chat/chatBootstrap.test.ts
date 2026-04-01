import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";

import {
  buildReferralContext,
  hasOnlyBootstrapAssistantMessage,
  shouldRefreshBootstrapMessages,
} from "./chatBootstrap";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${content}`,
    role,
    content,
    parts: [{ type: "text", text: content }],
    timestamp: new Date("2026-03-23T00:00:00.000Z"),
  };
}

describe("chatBootstrap", () => {
  it("builds referral context only when a referrer name is present", () => {
    expect(
      buildReferralContext({
        referrer: { name: "Ada Lovelace", credential: "Founder" },
      }),
    ).toEqual({
      referrerName: "Ada Lovelace",
      referrerCredential: "Founder",
    });

    expect(buildReferralContext({ referrer: { name: "   ", credential: "Founder" } })).toBeNull();
    expect(buildReferralContext(null)).toBeNull();
  });

  it("recognizes a single bootstrap assistant message", () => {
    expect(hasOnlyBootstrapAssistantMessage([createMessage("assistant", "hello")])).toBe(true);
    expect(hasOnlyBootstrapAssistantMessage([createMessage("user", "hello")])).toBe(false);
    expect(
      hasOnlyBootstrapAssistantMessage([
        createMessage("assistant", "hello"),
        createMessage("user", "follow-up"),
      ]),
    ).toBe(false);
  });

  it("refreshes bootstrap messages only when the provider is otherwise idle", () => {
    const bootstrap = [createMessage("assistant", "hello")];

    expect(
      shouldRefreshBootstrapMessages({
        messages: bootstrap,
        initialRole: "AUTHENTICATED",
        bootstrapRole: "ANONYMOUS",
        conversationId: null,
        currentConversation: null,
        isLoadingMessages: false,
        isSending: false,
      }),
    ).toBe(true);

    expect(
      shouldRefreshBootstrapMessages({
        messages: bootstrap,
        initialRole: "AUTHENTICATED",
        bootstrapRole: "ANONYMOUS",
        conversationId: "conv_123",
        currentConversation: null,
        isLoadingMessages: false,
        isSending: false,
      }),
    ).toBe(false);

    expect(
      shouldRefreshBootstrapMessages({
        messages: [createMessage("assistant", "hello"), createMessage("user", "follow-up")],
        initialRole: "AUTHENTICATED",
        bootstrapRole: "ANONYMOUS",
        conversationId: null,
        currentConversation: null,
        isLoadingMessages: false,
        isSending: false,
      }),
    ).toBe(false);
  });
});