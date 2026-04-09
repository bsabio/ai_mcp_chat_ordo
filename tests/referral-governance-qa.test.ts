import { describe, expect, it } from "vitest";

import type { RoleName } from "@/core/entities/user";
import {
  ANALYTICS_DATASET_SOURCE_TYPES,
  ANALYTICS_GRAPH_SOURCE_TYPES,
  listRegisteredAnalyticsSourceTypes,
} from "@/lib/analytics/analytics-dataset-registry";
import { getToolComposition } from "@/lib/chat/tool-composition-root";

import { EXPECTED_ROLE_TOOL_SETS } from "./helpers/role-tool-sets";

const REFERRAL_MEMBER_TOOL_NAMES = [
  "get_my_referral_qr",
  "get_my_affiliate_summary",
  "list_my_referral_activity",
] as const;

const REFERRAL_ADMIN_TOOL_NAMES = [
  "get_admin_affiliate_summary",
  "list_admin_referral_exceptions",
] as const;

const CHECKED_ROLES: readonly RoleName[] = [
  "ANONYMOUS",
  "AUTHENTICATED",
  "APPRENTICE",
  "STAFF",
  "ADMIN",
] as const;

describe("Sprint 4 referral governance", () => {
  it("keeps registered analytics dataset source types in sync with the exported contract", () => {
    expect([...listRegisteredAnalyticsSourceTypes()].sort()).toEqual([
      ...ANALYTICS_DATASET_SOURCE_TYPES,
    ].sort());
  });

  it("keeps graph source allowlists in sync with graph-capable analytics datasets", () => {
    expect([...listRegisteredAnalyticsSourceTypes("graph")].sort()).toEqual([
      ...ANALYTICS_GRAPH_SOURCE_TYPES,
    ].sort());
  });

  it("keeps referral analytics tool manifest parity with the composed registry", () => {
    const { registry } = getToolComposition();

    expect(registry.getToolNames()).toEqual(
      expect.arrayContaining([...REFERRAL_MEMBER_TOOL_NAMES, ...REFERRAL_ADMIN_TOOL_NAMES]),
    );

    for (const role of CHECKED_ROLES) {
      const manifestNames = new Set(EXPECTED_ROLE_TOOL_SETS[role]);

      for (const toolName of [...REFERRAL_MEMBER_TOOL_NAMES, ...REFERRAL_ADMIN_TOOL_NAMES]) {
        expect(
          manifestNames.has(toolName),
          `${role} manifest mismatch for ${toolName}`,
        ).toBe(registry.canExecute(toolName, role));
      }
    }
  });
});