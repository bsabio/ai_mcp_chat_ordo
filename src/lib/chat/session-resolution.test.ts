import { describe, expect, it } from "vitest";

import { resolveSessionResolutionSignal } from "./session-resolution";

describe("resolveSessionResolutionSignal", () => {
  it("marks explicit closed responses as resolved", () => {
    expect(resolveSessionResolutionSignal({
      status: "completed",
      assistantText: 'That resolves the scope. __response_state__:"closed"',
      assistantParts: [],
    })).toEqual({
      kind: "resolved",
      reason: "closed_response_state",
      responseState: "closed",
    });
  });

  it("marks blocking questions as blocked after stripping trailing actions", () => {
    expect(resolveSessionResolutionSignal({
      status: "completed",
      assistantText: 'Which API should I integrate first? __actions__:[{"label":"Open docs","action":"route","params":{"path":"/docs"}}]',
      assistantParts: [],
    })).toEqual({
      kind: "blocked",
      reason: "needs_input",
      responseState: "needs_input",
    });
  });

  it("marks open answers with actions as advanced", () => {
    expect(resolveSessionResolutionSignal({
      status: "completed",
      assistantText: 'Here is the scoped rollout plan. __actions__:[{"label":"Open plan","action":"route","params":{"path":"/plans/1"}}] __response_state__:"open"',
      assistantParts: [],
    })).toEqual({
      kind: "advanced",
      reason: "actionable_next_steps",
      responseState: "open",
    });
  });

  it("returns null for completed turns without a concrete resolution signal", () => {
    expect(resolveSessionResolutionSignal({
      status: "completed",
      assistantText: 'Happy to help. __response_state__:"open"',
      assistantParts: [],
    })).toBeNull();
  });
});