import { describe, expect, it } from "vitest";

import {
  buildTaskOriginContextBlock,
  getTaskOriginInstruction,
  normalizeTaskOriginHandoff,
} from "@/lib/chat/task-origin-handoff";

describe("task-origin handoff", () => {
  it("preserves distinct block-header and focus-rail contexts", () => {
    const leadQueue = normalizeTaskOriginHandoff({
      sourceBlockId: "lead_queue",
      sourceContextId: "lead-queue:header",
    });
    const focusRail = normalizeTaskOriginHandoff({
      sourceBlockId: "conversation_workspace",
      sourceContextId: "focus-rail:revenue",
    });

    expect(leadQueue).toEqual({
      sourceBlockId: "lead_queue",
      sourceContextId: "lead-queue:header",
    });
    expect(focusRail).toEqual({
      sourceBlockId: "conversation_workspace",
      sourceContextId: "focus-rail:revenue",
    });
  });

  it("normalizes mismatched or spoofed context ids to a safe fallback", () => {
    const handoff = normalizeTaskOriginHandoff({
      sourceBlockId: "lead_queue",
      sourceContextId: "focus-rail:revenue",
    });

    expect(handoff).toEqual({ sourceBlockId: "lead_queue" });
    expect(buildTaskOriginContextBlock(handoff!)).toContain("founder lead prioritization work");
  });

  it("accepts conversation workspace start handoff without an active conversation", () => {
    const handoff = normalizeTaskOriginHandoff({
      sourceBlockId: "conversation_workspace",
      sourceContextId: "conversation-workspace:start",
    });

    expect(handoff).toEqual({
      sourceBlockId: "conversation_workspace",
      sourceContextId: "conversation-workspace:start",
    });
    expect(buildTaskOriginContextBlock(handoff!)).toContain("starting a new workspace conversation");
  });

  it("lead-queue header instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "lead_queue",
      sourceContextId: "lead-queue:header",
    });
    expect(result).toContain("action links");
  });

  it("routing-review header instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "routing_review",
      sourceContextId: "routing-review:header",
    });
    expect(result).toContain("action links");
  });

  it("conversation-workspace resume instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "conversation_workspace",
      sourceContextId: "conversation-workspace:resume",
    });
    expect(result).toContain("action links");
  });

  it("lead_queue fallback instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "lead_queue",
    });
    expect(result).toContain("action links");
  });

  it("routing_review fallback instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "routing_review",
    });
    expect(result).toContain("action links");
  });

  it("conversation_workspace fallback instruction includes action link guidance", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "conversation_workspace",
    });
    expect(result).toContain("action links");
  });

  it("training-path-queue header instruction is unchanged", () => {
    const result = getTaskOriginInstruction({
      sourceBlockId: "training_path_queue",
      sourceContextId: "training-path-queue:header",
    });
    expect(result).toContain("learner recommendation");
  });
});