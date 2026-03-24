import { describe, expect, it } from "vitest";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

import { buildRoutingContextBlock } from "./routing-context";
import { buildTaskOriginContextBlock } from "./task-origin-handoff";

describe("buildRoutingContextBlock", () => {
  it("uses an organizational instruction for organization lanes", () => {
    const block = buildRoutingContextBlock(
      createConversationRoutingSnapshot({
        lane: "organization",
        confidence: 0.91,
      }),
    );

    expect(block).toContain('lane=organization');
    expect(block).toContain('routing_instruction="Center the response on organizational workflow, team process, stakeholder coordination, or business operations, and recommend next steps suited to an organizational buyer."');
  });

  it("uses an individual instruction for individual lanes", () => {
    const block = buildRoutingContextBlock(
      createConversationRoutingSnapshot({
        lane: "individual",
        confidence: 0.74,
      }),
    );

    expect(block).toContain('lane=individual');
    expect(block).toContain('routing_instruction="Center the response on an individual person\'s goals, constraints, or decision-making context, and recommend next steps suited to a solo buyer or personal use case."');
  });

  it("uses a technical instruction for development lanes", () => {
    const block = buildRoutingContextBlock(
      createConversationRoutingSnapshot({
        lane: "development",
        confidence: 0.84,
        detectedNeedSummary: "Needs help implementing an internal workflow.",
      }),
    );

    expect(block).toContain('lane=development');
    expect(block).toContain('detected_need_summary="Needs help implementing an internal workflow."');
    expect(block).toContain('routing_instruction="Center the response on implementation, delivery scope, integration details, or technical execution, and recommend next steps suited to a technical scoping or build conversation."');
  });

  it("keeps the clarifying instruction for uncertain lanes", () => {
    const block = buildRoutingContextBlock(
      createConversationRoutingSnapshot({
        lane: "uncertain",
        confidence: null,
      }),
    );

    expect(block).toContain('lane=uncertain');
    expect(block).toContain('confidence=unknown');
    expect(block).toContain('routing_instruction="Ask one brief clarifying question to determine whether the need is a customer workflow, technical implementation, or training outcome before making a lane-specific recommendation."');
  });

  it("builds a task-origin handoff block that preserves the clicked task frame", () => {
    const block = buildTaskOriginContextBlock({
      sourceBlockId: "lead_queue",
      sourceContextId: "lead-queue:header",
    });

    expect(block).toContain("[Server task-origin handoff]");
    expect(block).toContain("source_block_id=lead_queue");
    expect(block).toContain("source_context_id=lead-queue:header");
    expect(block).toContain("founder lead queue");
  });
});