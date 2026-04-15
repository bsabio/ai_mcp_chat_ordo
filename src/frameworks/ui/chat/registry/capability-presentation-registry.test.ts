import { describe, expect, it } from "vitest";

import {
  CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES,
  getCapabilityPresentationDescriptor,
  getCapabilityPresentationDescriptors,
} from "./capability-presentation-registry";

describe("capability presentation registry", () => {
  it("returns the canonical descriptor for a custom-card capability", () => {
    expect(getCapabilityPresentationDescriptor("generate_chart")).toMatchObject({
      toolName: "generate_chart",
      family: "artifact",
      cardKind: "artifact_viewer",
      executionMode: "browser",
      progressMode: "single",
      defaultSurface: "conversation",
      artifactKinds: ["chart"],
    });
  });

  it("returns the canonical descriptor for a fallback chat capability", () => {
    expect(getCapabilityPresentationDescriptor("search_corpus")).toMatchObject({
      toolName: "search_corpus",
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
      supportsRetry: "none",
    });
  });

  it("keeps fallback descriptors for non-custom tool surfaces", () => {
    expect(getCapabilityPresentationDescriptor("get_my_job_status")).toBeDefined();
    expect(getCapabilityPresentationDescriptor("list_deferred_jobs")).toBeDefined();
    expect(getCapabilityPresentationDescriptor("admin_search")).toBeDefined();
  });

  it("exports a unique descriptor row for every chat-exposed capability", () => {
    const descriptors = getCapabilityPresentationDescriptors();
    const toolNames = descriptors.map((descriptor) => descriptor.toolName);

    expect(toolNames).toEqual(CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES);
    expect(new Set(toolNames).size).toBe(toolNames.length);
  });
});