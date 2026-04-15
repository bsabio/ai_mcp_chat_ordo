import { describe, expect, it, vi } from "vitest";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import {
  DefaultPromptRuntime,
  PromptRuntimeBuilder,
} from "@/lib/chat/prompt-runtime";

function createPromptRepo(overrides?: {
  base?: { content: string; version: number } | null;
  directive?: { role: string; content: string; version: number } | null;
}) {
  return {
    getActive: vi.fn(async (role: string, promptType: string) => {
      if (role === "ALL" && promptType === "base") {
        return overrides?.base === null
          ? null
          : {
              id: "prompt_base",
              role: "ALL",
              promptType: "base",
              content: overrides?.base?.content ?? "DB base prompt",
              version: overrides?.base?.version ?? 3,
              isActive: true,
              createdAt: "2026-04-01T00:00:00.000Z",
              createdBy: "usr_admin",
              notes: "base",
            };
      }

      if (role === (overrides?.directive?.role ?? "ADMIN") && promptType === "role_directive") {
        return overrides?.directive === null
          ? null
          : {
              id: "prompt_directive",
              role,
              promptType: "role_directive",
              content: overrides?.directive?.content ?? "DB role directive",
              version: overrides?.directive?.version ?? 5,
              isActive: true,
              createdAt: "2026-04-01T00:00:00.000Z",
              createdBy: "usr_admin",
              notes: "directive",
            };
      }

      return null;
    }),
    listVersions: vi.fn(),
    getByVersion: vi.fn(),
    createVersion: vi.fn(),
    activate: vi.fn(),
  };
}

function createRuntime() {
  return new DefaultPromptRuntime(
    createPromptRepo() as never,
    { getIdentity: () => "Fallback identity" } as never,
  );
}

describe("prompt surface contract", () => {
  it("preserves governed slot provenance across chat_stream, direct_turn, and live_eval", async () => {
    const runtime = createRuntime();

    const [chatStream, directTurn, liveEval] = await Promise.all([
      runtime.build({ surface: "chat_stream", role: "ADMIN" }),
      runtime.build({ surface: "direct_turn", role: "ADMIN" }),
      runtime.build({ surface: "live_eval", role: "ADMIN" }),
    ]);

    for (const result of [chatStream, directTurn, liveEval]) {
      expect(result.slotRefs).toEqual([
        {
          role: "ALL",
          promptType: "base",
          source: "db",
          promptId: "prompt_base",
          version: 3,
        },
        {
          role: "ADMIN",
          promptType: "role_directive",
          source: "db",
          promptId: "prompt_directive",
          version: 5,
        },
      ]);
      expect(result.warnings).toEqual([]);
      expect(result.sections.map((section) => section.key)).toEqual(
        expect.arrayContaining(["identity", "role_directive"]),
      );
      expect(result.text).toContain("DB base prompt");
      expect(result.text).toContain("DB role directive");
    }
  });

  it("keeps surface-specific prompt sections intentionally distinct", async () => {
    const runtime = createRuntime();
    const routingSnapshot = createConversationRoutingSnapshot({
      lane: "organization",
      confidence: 0.93,
    });

    const chatBuilder = new PromptRuntimeBuilder(runtime, {
      surface: "chat_stream",
      role: "ADMIN",
      currentPathname: "/admin/leads",
      currentPageSnapshot: {
        pathname: "/admin/leads",
        title: "Leads | Admin",
        mainHeading: "Leads",
        sectionHeadings: ["Pipeline"],
        selectedText: null,
        contentExcerpt: "Review qualified leads and their next actions.",
      },
      taskOriginHandoff: {
        sourceBlockId: "lead_queue",
        sourceContextId: "lead-queue:header",
      },
    });
    chatBuilder.withToolManifest([
      { name: "search_corpus", description: "Search the corpus." },
    ]);
    chatBuilder.withUserPreferences([
      { key: "tone", value: "concise", updatedAt: "2026-04-01T00:00:00.000Z" },
    ]);
    chatBuilder.withConversationSummary("Earlier lead triage context.");
    chatBuilder.withRoutingContext(routingSnapshot);
    chatBuilder.withTrustedReferralContext({
      referralId: "ref_1",
      referralCode: "mentor-42",
      referrerUserId: "usr_affiliate",
      referrerName: "Ada Lovelace",
      referrerCredential: "Founder",
      referredUserId: null,
      conversationId: "conv_prompt_surface",
      status: "visited",
      creditStatus: "tracked",
    });

    const directBuilder = new PromptRuntimeBuilder(runtime, {
      surface: "direct_turn",
      role: "ADMIN",
    });
    directBuilder.withToolManifest([
      { name: "search_corpus", description: "Search the corpus." },
    ]);
    directBuilder.withUserPreferences([
      { key: "tone", value: "concise", updatedAt: "2026-04-01T00:00:00.000Z" },
    ]);

    const liveEvalBuilder = new PromptRuntimeBuilder(runtime, {
      surface: "live_eval",
      role: "ADMIN",
      currentPathname: "/services",
      currentPageSnapshot: {
        pathname: "/services",
        title: "Services | Studio Ordo",
        mainHeading: "Services",
        sectionHeadings: ["Advisory"],
        selectedText: null,
        contentExcerpt: "Service positioning and commercial next steps.",
      },
    });
    liveEvalBuilder.withRoutingContext(routingSnapshot);
    liveEvalBuilder.withSection({
      key: "live_eval_funnel_directive",
      content: "\n[Live eval funnel directive]\nFocus on the current workflow.",
      priority: 41,
    });

    const [chatStream, directTurn, liveEval] = await Promise.all([
      chatBuilder.buildResult(),
      directBuilder.buildResult(),
      liveEvalBuilder.buildResult(),
    ]);

    expect(chatStream.sections.map((section) => section.key)).toEqual(
      expect.arrayContaining([
        "identity",
        "role_directive",
        "page_context",
        "tool_manifest",
        "user_preferences",
        "summary",
        "trusted_referral",
        "routing",
        "task_origin_handoff",
      ]),
    );
    expect(chatStream.text).toContain("[Server referral attribution]");
    expect(chatStream.text).toContain("[Server task-origin handoff]");

    expect(directTurn.sections.map((section) => section.key)).toEqual(
      expect.arrayContaining([
        "identity",
        "role_directive",
        "tool_manifest",
        "user_preferences",
      ]),
    );
    expect(directTurn.sections.map((section) => section.key)).not.toEqual(
      expect.arrayContaining(["summary", "trusted_referral", "routing", "task_origin_handoff"]),
    );
    expect(directTurn.text).toContain("TOOLS AVAILABLE TO YOU:");
    expect(directTurn.text).not.toContain("[Server referral attribution]");

    expect(liveEval.sections.map((section) => section.key)).toEqual(
      expect.arrayContaining([
        "identity",
        "role_directive",
        "page_context",
        "live_eval_funnel_directive",
        "routing",
      ]),
    );
    expect(liveEval.sections.map((section) => section.key)).not.toEqual(
      expect.arrayContaining(["trusted_referral", "task_origin_handoff", "summary"]),
    );
    expect(liveEval.text).toContain("[Live eval funnel directive]");
    expect(liveEval.text).toContain("[Server routing metadata]");

    expect(new Set([
      chatStream.effectiveHash,
      directTurn.effectiveHash,
      liveEval.effectiveHash,
    ]).size).toBe(3);
  });
});