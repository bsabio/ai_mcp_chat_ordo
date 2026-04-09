import { existsSync } from "node:fs";
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

describe("TD-C4 operator convergence", () => {
  it("keeps the canonical operator facade available as the public loader surface", () => {
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

  it("keeps the operator implementation modules in place", () => {
    expect(existsSync(join(process.cwd(), "src/lib/operator/operator-shared.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/operator-contracts.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/operator-helpers.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/customer-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/customer-loader-helpers.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/customer-conversation-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/customer-workflow-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/admin-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/admin-review-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/admin-queue-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/admin-health-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/analytics-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/analytics-opportunity-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/analytics-theme-loaders.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/operator/loaders/analytics-funnel-loaders.ts"))).toBe(true);
  });

  it("removes the obsolete dashboard compatibility layer", () => {
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/dashboard-shared.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/dashboard-contracts.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/dashboard-helpers.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/dashboard-loaders.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/loaders/customer-loaders.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/loaders/admin-loaders.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/dashboard/loaders/analytics-loaders.ts"))).toBe(false);
  });
});