import { describe, expect, it } from "vitest";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

import {
  getContactCaptureFieldProfile,
  getLaneRecommendedNextStep,
  isHighConfidenceLane,
} from "./routing-consumers";

describe("routing-consumers", () => {
  it("treats organization lanes above threshold as high confidence", () => {
    expect(
      isHighConfidenceLane(
        createConversationRoutingSnapshot({ lane: "organization", confidence: 0.82 }),
      ),
    ).toBe(true);
  });

  it("does not treat uncertain lanes as high confidence", () => {
    expect(
      isHighConfidenceLane(
        createConversationRoutingSnapshot({ lane: "uncertain", confidence: 0.91 }),
      ),
    ).toBe(false);
  });

  it("returns organization contact fields for organizational routing", () => {
    expect(
      getContactCaptureFieldProfile(
        createConversationRoutingSnapshot({ lane: "organization", confidence: 0.9 }),
      ),
    ).toEqual({
      profile: "organization",
      requiredFields: ["name", "email", "organization", "roleOrTitle"],
      optionalFields: ["teamContext"],
    });
  });

  it("does not defer organization capture fields when confidence is below the individual threshold", () => {
    expect(
      getContactCaptureFieldProfile(
        createConversationRoutingSnapshot({ lane: "organization", confidence: 0.45 }),
      ),
    ).toEqual({
      profile: "organization",
      requiredFields: ["name", "email", "organization", "roleOrTitle"],
      optionalFields: ["teamContext"],
    });
  });

  it("returns individual contact fields for individual routing", () => {
    expect(
      getContactCaptureFieldProfile(
        createConversationRoutingSnapshot({ lane: "individual", confidence: 0.75 }),
      ),
    ).toEqual({
      profile: "individual",
      requiredFields: ["name", "email", "roleOrTitle"],
      optionalFields: ["trainingGoal"],
    });
  });

  it("returns development contact fields for development routing", () => {
    expect(
      getContactCaptureFieldProfile(
        createConversationRoutingSnapshot({ lane: "development", confidence: 0.82 }),
      ),
    ).toEqual({
      profile: "development",
      requiredFields: ["name", "email", "organization", "roleOrTitle"],
      optionalFields: ["technicalContext", "deliveryScope"],
    });
  });

  it("defers contact capture fields for low-confidence routing", () => {
    expect(
      getContactCaptureFieldProfile(
        createConversationRoutingSnapshot({ lane: "individual", confidence: 0.45 }),
      ),
    ).toEqual({
      profile: "deferred",
      requiredFields: [],
      optionalFields: ["clarifyingQuestion"],
    });
  });

  it("returns the recommended next step when present", () => {
    expect(
      getLaneRecommendedNextStep(
        createConversationRoutingSnapshot({ recommendedNextStep: "Schedule a discovery call" }),
      ),
    ).toBe("Schedule a discovery call");
  });
});