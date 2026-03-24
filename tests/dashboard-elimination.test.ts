import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadAnonymousOpportunitiesBlock,
  loadConsultationRequestQueueBlock,
  loadConversationWorkspaceBlock,
  loadCustomerWorkflowContinuityBlock,
  loadDealQueueBlock,
  loadFunnelRecommendationsBlock,
  loadLeadQueueBlock,
  loadRecentConversationsBlock,
  loadRecurringPainThemesBlock,
  loadRoutingReviewBlock,
  loadSystemHealthBlock,
  loadTrainingPathQueueBlock,
} from "@/lib/operator/operator-signal-loaders";
import {
  resolveShellHomeHref,
  SHELL_ROUTES,
} from "@/lib/shell/shell-navigation";

function exists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("dashboard elimination — positive tests", () => {
  const layout = readSource("src/app/layout.tsx");
  const nextConfig = readSource("next.config.ts");

  it("P1: layout.tsx does not import GridInspector", () => {
    expect(layout).not.toContain("GridInspector");
  });

  it("P2: layout.tsx does not import CommandPalette", () => {
    expect(layout).not.toContain("CommandPalette");
  });

  it("P3: layout.tsx does not render GridInspector or CommandPalette", () => {
    expect(layout).not.toMatch(/<GridInspector/);
    expect(layout).not.toMatch(/<CommandPalette/);
  });

  it("P4: next.config.ts includes /dashboard redirect", () => {
    expect(nextConfig).toContain('source: "/dashboard"');
    expect(nextConfig).toContain('destination: "/"');
    expect(nextConfig).toContain("permanent: true");
  });

  it("P5: resolveShellHomeHref returns / for all users", () => {
    expect(resolveShellHomeHref()).toBe("/");
  });

  it("P6: SHELL_ROUTES does not include dashboard", () => {
    const ids = SHELL_ROUTES.map((r) => r.id);
    expect(ids).not.toContain("dashboard");
    const hrefs = SHELL_ROUTES.map((r) => r.href);
    expect(hrefs).not.toContain("/dashboard");
  });

  it("P7: operator-signal-loaders exports all 12 canonical loader functions", () => {
    const loaders = [
      loadConversationWorkspaceBlock,
      loadRecentConversationsBlock,
      loadCustomerWorkflowContinuityBlock,
      loadRoutingReviewBlock,
      loadLeadQueueBlock,
      loadSystemHealthBlock,
      loadAnonymousOpportunitiesBlock,
      loadRecurringPainThemesBlock,
      loadFunnelRecommendationsBlock,
      loadConsultationRequestQueueBlock,
      loadDealQueueBlock,
      loadTrainingPathQueueBlock,
    ];

    expect(loaders).toHaveLength(12);
    for (const loader of loaders) {
      expect(typeof loader).toBe("function");
    }
  });

  it("P8: task-origin-handoff.ts is the canonical handoff implementation", () => {
    const source = readSource("src/lib/chat/task-origin-handoff.ts");
    expect(source).toContain("export interface TaskOriginHandoff");
    expect(source).toContain("export function normalizeTaskOriginHandoff");
    expect(source).toContain("export function buildTaskOriginContextBlock");
  });
});

describe("dashboard elimination — deleted files", () => {
  it("N1: src/app/dashboard/ directory does not exist", () => {
    expect(exists("src/app/dashboard")).toBe(false);
  });

  it("N2: src/components/dashboard/ directory does not exist", () => {
    expect(exists("src/components/dashboard")).toBe(false);
  });

  it("N3: GridInspector.tsx does not exist", () => {
    expect(exists("src/components/GridInspector.tsx")).toBe(false);
  });

  it("N4: CommandPalette.tsx does not exist", () => {
    expect(exists("src/components/CommandPalette.tsx")).toBe(false);
  });

  it("N5: dashboard-blocks.ts does not exist", () => {
    expect(exists("src/lib/dashboard/dashboard-blocks.ts")).toBe(false);
  });

  it("N6: dashboard-visibility.ts does not exist", () => {
    expect(exists("src/lib/dashboard/dashboard-visibility.ts")).toBe(false);
  });

  it("N7: dashboard-focus.ts does not exist", () => {
    expect(exists("src/lib/dashboard/dashboard-focus.ts")).toBe(false);
  });

  it("N8: dashboard-ordering.ts does not exist", () => {
    expect(exists("src/lib/dashboard/dashboard-ordering.ts")).toBe(false);
  });

  it("N9: dashboard-chat-intents.ts does not exist", () => {
    expect(exists("src/lib/dashboard/dashboard-chat-intents.ts")).toBe(false);
  });

  it("N10: dashboard compatibility files are fully removed", () => {
    expect(exists("src/lib/dashboard/dashboard-loaders.ts")).toBe(false);
    expect(exists("src/lib/dashboard/dashboard-shared.ts")).toBe(false);
    expect(exists("src/lib/dashboard/dashboard-contracts.ts")).toBe(false);
    expect(exists("src/lib/dashboard/dashboard-helpers.ts")).toBe(false);
    expect(exists("src/lib/dashboard/dashboard-types.ts")).toBe(false);
  });
});

describe("dashboard elimination — preserved files", () => {
  it("E1: task-origin-handoff.ts still exists", () => {
    expect(exists("src/lib/chat/task-origin-handoff.ts")).toBe(true);
  });

  it("E2: task-origin handoff tests still exist", () => {
    expect(exists("tests/task-origin-handoff.test.ts")).toBe(true);
  });
});
