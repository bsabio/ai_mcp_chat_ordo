import { describe, expect, it } from "vitest";

import { resolveCapabilityTone } from "./capability-card-tone";

describe("resolveCapabilityTone", () => {
  it("prefers explicit tone overrides", () => {
    expect(
      resolveCapabilityTone({
        tone: "media",
        descriptor: { family: "editorial", cardKind: "editorial_workflow" },
        state: "failed",
      }),
    ).toBe("media");
  });

  it("prefers descriptor family before terminal state", () => {
    expect(
      resolveCapabilityTone({
        descriptor: { family: "editorial", cardKind: "editorial_workflow" },
        state: "failed",
      }),
    ).toBe("editorial");
  });

  it("falls back to state when no descriptor context is available", () => {
    expect(resolveCapabilityTone({ state: "failed" })).toBe("danger");
    expect(resolveCapabilityTone({ state: "queued" })).toBe("neutral");
  });

  it("maps media card kinds when only card-kind context is available", () => {
    expect(resolveCapabilityTone({ cardKind: "media_render" })).toBe("media");
  });
});
