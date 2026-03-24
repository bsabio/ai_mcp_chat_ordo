import { afterEach, describe, expect, it } from "vitest";

import { inflateDeterministicSeedPack, resolveDeterministicSeedPack } from "@/lib/evals/seeding";
import { createEvalWorkspace } from "@/lib/evals/workspace";

describe("eval workspace", () => {
  let workspace = createEvalWorkspace();

  afterEach(() => {
    workspace.destroy();
    workspace = createEvalWorkspace();
  });

  it("inflates seeded users, conversations, and messages into an isolated workspace", async () => {
    const pack = resolveDeterministicSeedPack("anonymous-signup-continuity");
    await inflateDeterministicSeedPack(workspace, pack);

    const conversation = await workspace.conversationRepo.findById("conv_eval_signup_continuity");
    const messages = await workspace.listMessages("conv_eval_signup_continuity");

    expect(conversation?.userId).toBe("anon_eval_signup");
    expect(conversation?.routingSnapshot.lane).toBe("individual");
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("supports seeding downstream workflow records with real mappers", async () => {
    await workspace.seedUser({ id: "usr_eval_downstream", email: "downstream@example.com", name: "Downstream User" });
    await workspace.seedConversation({
      id: "conv_eval_downstream",
      userId: "usr_eval_downstream",
      title: "Downstream record seed",
      sessionSource: "authenticated",
      lane: "individual",
      confidence: 0.9,
      recommendedNextStep: "Continue founder follow-up.",
      detectedNeedSummary: "Test downstream record seeding.",
      lastAnalyzedAt: "2026-03-20T15:00:00.000Z",
      createdAt: "2026-03-20T15:00:00.000Z",
      updatedAt: "2026-03-20T15:01:00.000Z",
      messages: [
        {
          id: "msg_eval_downstream_1",
          role: "user",
          content: "I need a serious operator training path.",
          createdAt: "2026-03-20T15:00:30.000Z",
        },
      ],
    });

    const leadId = await workspace.seedLead({
      conversationId: "conv_eval_downstream",
      lane: "individual",
      name: "Taylor Example",
      email: "taylor@example.com",
      organization: null,
      roleOrTitle: "Designer",
      trainingGoal: "Transition into operator work",
      problemSummary: "Needs a structured path.",
      recommendedNextAction: "Recommend apprenticeship screening.",
      qualification: { trainingFit: "career_transition" },
      triageState: "qualified",
      founderNote: "Looks promising.",
    });

    const requestId = await workspace.seedConsultationRequest({
      conversationId: "conv_eval_downstream",
      userId: "usr_eval_downstream",
      lane: "individual",
      requestSummary: "Need to talk through the path.",
      status: "reviewed",
      founderNote: "Ready for follow-up.",
    });

    const dealId = await workspace.seedDeal({
      conversationId: "conv_eval_downstream",
      consultationRequestId: null,
      leadRecordId: leadId,
      userId: "usr_eval_downstream",
      lane: "development",
      title: "Test deal",
      organizationName: "Example Org",
      problemSummary: "Test scope",
      proposedScope: "",
      recommendedServiceType: "delivery",
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      status: "draft",
      nextAction: "Follow up",
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    const trainingId = await workspace.seedTrainingPath({
      conversationId: "conv_eval_downstream",
      leadRecordId: leadId,
      consultationRequestId: requestId,
      userId: "usr_eval_downstream",
      currentRoleOrBackground: "Designer",
      technicalDepth: "career_transition",
      primaryGoal: "Become an operator",
      preferredFormat: null,
      apprenticeshipInterest: "maybe",
      recommendedPath: "apprenticeship_screening",
      fitRationale: "Strong fit",
      customerSummary: "Recommend screening",
      status: "recommended",
      nextAction: "Schedule screening",
      founderNote: "Ready",
    });

    expect(await workspace.leadRepo.findById(leadId)).toMatchObject({ triageState: "qualified" });
    expect(await workspace.consultationRequestRepo.findById(requestId)).toMatchObject({ status: "reviewed" });
    expect(await workspace.dealRepo.findById(dealId)).toMatchObject({ title: "Test deal" });
    expect(await workspace.trainingPathRepo.findById(trainingId)).toMatchObject({ status: "recommended" });
  });

  it("supports seeding conversation events and appending messages", async () => {
    await workspace.seedUser({ id: "usr_eval_messages", email: "messages@example.com", name: "Message User" });
    await workspace.seedConversation({
      id: "conv_eval_messages",
      userId: "usr_eval_messages",
      title: "Append and event test",
      sessionSource: "authenticated",
      lane: "organization",
      confidence: 0.88,
      recommendedNextStep: "Continue founder review.",
      detectedNeedSummary: "Testing message append and events.",
      lastAnalyzedAt: "2026-03-20T18:00:00.000Z",
      createdAt: "2026-03-20T18:00:00.000Z",
      updatedAt: "2026-03-20T18:00:00.000Z",
      messages: [],
    });

    await workspace.seedConversationEvent({
      id: "evt_eval_messages_1",
      conversationId: "conv_eval_messages",
      type: "founder_review_requested",
      metadata: { lane: "organization" },
      createdAt: "2026-03-20T18:01:00.000Z",
    });
    await workspace.appendMessage({
      conversationId: "conv_eval_messages",
      role: "user",
      content: "Can we keep moving on this workflow?",
      createdAt: "2026-03-20T18:02:00.000Z",
    });

    expect(await workspace.listConversationEvents("conv_eval_messages")).toEqual([
      expect.objectContaining({ type: "founder_review_requested" }),
    ]);
    expect(await workspace.listMessages("conv_eval_messages")).toEqual([
      expect.objectContaining({ role: "user", content: "Can we keep moving on this workflow?" }),
    ]);
  });
});