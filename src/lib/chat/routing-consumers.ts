import type { ConversationLane, ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

export interface ContactCaptureFieldProfile {
  profile: ConversationLane | "deferred";
  requiredFields: string[];
  optionalFields: string[];
}

const HIGH_CONFIDENCE_THRESHOLD = 0.7;

export function isHighConfidenceLane(snapshot: ConversationRoutingSnapshot | null | undefined): boolean {
  if (!snapshot || snapshot.lane === "uncertain") {
    return false;
  }

  return (snapshot.confidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD;
}

export function getLaneRecommendedNextStep(
  snapshot: ConversationRoutingSnapshot | null | undefined,
): string | null {
  return snapshot?.recommendedNextStep ?? null;
}

export function getContactCaptureFieldProfile(
  snapshot: ConversationRoutingSnapshot | null | undefined,
): ContactCaptureFieldProfile {
  if (!snapshot || snapshot.lane === "uncertain") {
    return {
      profile: "deferred",
      requiredFields: [],
      optionalFields: ["clarifyingQuestion"],
    };
  }

  if (snapshot.lane === "organization") {
    return {
      profile: "organization",
      requiredFields: ["name", "email", "organization", "roleOrTitle"],
      optionalFields: ["teamContext"],
    };
  }

  if (!isHighConfidenceLane(snapshot)) {
    return {
      profile: "deferred",
      requiredFields: [],
      optionalFields: ["clarifyingQuestion"],
    };
  }

  if (snapshot.lane === "development") {
    return {
      profile: "development",
      requiredFields: ["name", "email", "organization", "roleOrTitle"],
      optionalFields: ["technicalContext", "deliveryScope"],
    };
  }

  return {
    profile: "individual",
    requiredFields: ["name", "email", "roleOrTitle"],
    optionalFields: ["trainingGoal"],
  };
}