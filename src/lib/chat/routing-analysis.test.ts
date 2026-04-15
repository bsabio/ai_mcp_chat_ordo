import { describe, expect, it } from "vitest";

import type { Conversation, Message } from "@/core/entities/conversation";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

import { HeuristicConversationRoutingAnalyzer } from "./routing-analysis";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "",
    status: "active",
    createdAt: "2026-03-18T10:00:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
    convertedFrom: null,
    messageCount: 0,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot(),
    referralSource: null,
    ...overrides,
  };
}

function makeUserMessage(content: string): Message {
  return {
    id: crypto.randomUUID(),
    conversationId: "conv_1",
    role: "user",
    content,
    parts: [{ type: "text", text: content }],
    createdAt: "2026-03-18T10:00:00.000Z",
    tokenEstimate: Math.ceil(content.length / 4),
  };
}

describe("HeuristicConversationRoutingAnalyzer", () => {
  const analyzer = new HeuristicConversationRoutingAnalyzer();

  it("routes organizational workflow requests to the organization lane", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("Our team needs help redesigning an internal workflow for staff onboarding.")],
      latestUserText: "Our team needs help redesigning an internal workflow for staff onboarding.",
    });

    expect(snapshot.lane).toBe("organization");
    expect(snapshot.confidence).toBeGreaterThan(0.6);
    expect(snapshot.recommendedNextStep).toContain("advisory scoping");
  });

  it("routes mentorship requests to the individual lane", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("I want mentorship and training so I can become a stronger AI operator.")],
      latestUserText: "I want mentorship and training so I can become a stronger AI operator.",
    });

    expect(snapshot.lane).toBe("individual");
    expect(snapshot.confidence).toBeGreaterThan(0.6);
    expect(snapshot.recommendedNextStep).toContain("training fit");
  });

  it("routes implementation-heavy requests to the development lane", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("We need you to build an internal automation platform and integrate it with our API.")],
      latestUserText: "We need you to build an internal automation platform and integrate it with our API.",
    });

    expect(snapshot.lane).toBe("development");
    expect(snapshot.confidence).toBeGreaterThan(0.6);
    expect(snapshot.recommendedNextStep).toContain("technical feasibility");
  });

  it("returns uncertain when signals are ambiguous", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("I need help but I am not sure if this is for me or for a future team.")],
      latestUserText: "I need help but I am not sure if this is for me or for a future team.",
    });

    expect(snapshot.lane).toBe("uncertain");
    expect(snapshot.recommendedNextStep).toContain("clarifying question");
    expect(snapshot.recommendedNextStep).toContain("customer workflow, technical implementation, or training outcome");
  });

  it("returns uncertain when development and organization signals are both strong", async () => {
    const mixedNeed = "Our company needs you to build, implement, and integrate an internal workflow automation platform with our API for the team operations.";

    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage(mixedNeed)],
      latestUserText: mixedNeed,
    });

    expect(snapshot.lane).toBe("development");
    expect(snapshot.confidence).toBeGreaterThanOrEqual(0.5);
    expect(snapshot.detectedNeedSummary).toContain("Signals still lean development despite mixed cues");
  });

  it("keeps ambiguous mixed-signal asks on the clarifying path below the interruption threshold", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("I am not sure whether we need team training or a technical build for this workflow yet.")],
      latestUserText: "I am not sure whether we need team training or a technical build for this workflow yet.",
    });

    expect(snapshot.lane).toBe("uncertain");
    expect(snapshot.confidence).toBeLessThan(0.25);
    expect(snapshot.recommendedNextStep).toContain("clarifying question");
  });

  it("uses customer-facing uncertain copy when no signals are present", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation(),
      messages: [makeUserMessage("hello")],
      latestUserText: "hello",
    });

    expect(snapshot.lane).toBe("uncertain");
    expect(snapshot.detectedNeedSummary).toContain("workflow question, implementation task, or training need");
    expect(snapshot.recommendedNextStep).toContain("customer workflow, technical implementation, or training outcome");
  });

  it("preserves a prior non-uncertain lane when new signals are weak", async () => {
    const snapshot = await analyzer.analyze({
      conversation: makeConversation({
        routingSnapshot: createConversationRoutingSnapshot({
          lane: "organization",
          confidence: 0.7,
          recommendedNextStep: "Existing recommendation",
          detectedNeedSummary: "Existing summary",
          lastAnalyzedAt: "2026-03-18T09:00:00.000Z",
        }),
      }),
      messages: [makeUserMessage("Can you help?")],
      latestUserText: "Can you help?",
    });

    expect(snapshot.lane).toBe("organization");
    expect(snapshot.lastAnalyzedAt).toBeTruthy();
  });
});