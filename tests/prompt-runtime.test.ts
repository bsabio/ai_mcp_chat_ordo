import { describe, expect, it, vi, afterEach } from "vitest";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

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

      if (role === (overrides?.directive?.role ?? "AUTHENTICATED") && promptType === "role_directive") {
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

describe("DefaultPromptRuntime", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/config/instance");
  });

  it("returns governed slot provenance, ordered sections, and a stable hash", async () => {
    const { DefaultPromptRuntime } = await import("@/lib/chat/prompt-runtime");
    const runtime = new DefaultPromptRuntime(
      createPromptRepo() as never,
      { getIdentity: () => "Fallback identity" } as never,
    );

    const request = {
      surface: "chat_stream" as const,
      role: "AUTHENTICATED" as const,
      currentPathname: "/register",
      currentPageSnapshot: {
        pathname: "/register",
        title: "Register | Studio Ordo",
        mainHeading: "Create Account",
        sectionHeadings: ["Password"],
        selectedText: null,
        contentExcerpt: "Save conversations and unlock richer tools.",
      },
      capabilityManifest: [
        { name: "search_corpus", description: "Search the corpus." },
      ],
      userPreferences: [
        { key: "tone", value: "professional", updatedAt: "2026-04-01T00:00:00.000Z" },
      ],
      conversationSummary: "Earlier context.",
      routingSnapshot: createConversationRoutingSnapshot({
        lane: "organization",
        confidence: 0.91,
      }),
      includeTrustedReferralContext: true,
      trustedReferralContext: null,
    };

    const first = await runtime.build(request);
    const second = await runtime.build(request);

    expect(first.slotRefs).toEqual([
      {
        role: "ALL",
        promptType: "base",
        source: "db",
        promptId: "prompt_base",
        version: 3,
      },
      {
        role: "AUTHENTICATED",
        promptType: "role_directive",
        source: "db",
        promptId: "prompt_directive",
        version: 5,
      },
    ]);
    expect(first.warnings).toEqual([]);
    expect(first.effectiveHash).toBe(second.effectiveHash);

    const identityIndex = first.text.indexOf("DB base prompt");
    const manifestIndex = first.text.indexOf("TOOLS AVAILABLE TO YOU:");
    const directiveIndex = first.text.indexOf("DB role directive");
    const pageIndex = first.text.indexOf("[Authoritative current page snapshot]");
    const preferencesIndex = first.text.indexOf("[Server user preferences]");
    const summaryIndex = first.text.indexOf("[Server summary of earlier conversation]");
    const referralIndex = first.text.indexOf("[Server referral attribution]");
    const routingIndex = first.text.indexOf("[Server routing metadata]");

    expect(identityIndex).toBeGreaterThan(-1);
    expect(manifestIndex).toBeGreaterThan(identityIndex);
    expect(directiveIndex).toBeGreaterThan(manifestIndex);
    expect(pageIndex).toBeGreaterThan(directiveIndex);
    expect(preferencesIndex).toBeGreaterThan(pageIndex);
    expect(summaryIndex).toBeGreaterThan(preferencesIndex);
    expect(referralIndex).toBeGreaterThan(summaryIndex);
    expect(routingIndex).toBeGreaterThan(referralIndex);
  });

  it("reports fallback slot usage and config overlay provenance", async () => {
    vi.doMock("@/lib/config/instance", () => ({
      getInstanceIdentity: () => ({ name: "Acme Studio" }),
      getInstancePrompts: () => ({ personality: "Stay direct." }),
    }));

    const { DefaultPromptRuntime } = await import("@/lib/chat/prompt-runtime");
    const runtime = new DefaultPromptRuntime(
      createPromptRepo({ base: null, directive: null }) as never,
      { getIdentity: () => "Acme Studio identity\n\nStay direct." } as never,
    );

    const result = await runtime.build({
      surface: "direct_turn",
      role: "ADMIN",
    });

    expect(result.slotRefs).toEqual([
      expect.objectContaining({ role: "ALL", promptType: "base", source: "fallback" }),
      expect.objectContaining({ role: "ADMIN", promptType: "role_directive", source: "fallback" }),
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "slot_fallback", slotKey: "ALL/base" }),
        expect.objectContaining({ code: "slot_fallback", slotKey: "ADMIN/role_directive" }),
        expect.objectContaining({ code: "identity_name_overlay", sectionKey: "identity_name_overlay" }),
        expect.objectContaining({ code: "personality_overlay", sectionKey: "personality_overlay" }),
      ]),
    );
    expect(result.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "identity_name_overlay", parentKey: "identity" }),
        expect.objectContaining({ key: "personality_overlay", parentKey: "identity" }),
      ]),
    );
  });

  it("supports explicit system prompt overrides while preserving provenance warnings", async () => {
    const { DefaultPromptRuntime } = await import("@/lib/chat/prompt-runtime");
    const runtime = new DefaultPromptRuntime(
      createPromptRepo() as never,
      { getIdentity: () => "Fallback identity" } as never,
    );

    const result = await runtime.build({
      surface: "live_eval",
      role: "STAFF",
      systemPromptOverride: "Custom eval system prompt",
      extraSections: [
        {
          key: "live_eval_funnel_directive",
          content: "\n[Live eval funnel directive]\nFocus on the current workflow.",
          priority: 41,
        },
      ],
    });

    expect(result.slotRefs).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "system_prompt_override" }),
    ]);
    expect(result.text).toContain("Custom eval system prompt");
    expect(result.text).toContain("[Live eval funnel directive]");
  });
});