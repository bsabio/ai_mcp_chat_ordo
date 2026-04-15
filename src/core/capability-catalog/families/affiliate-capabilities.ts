import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";
import { SIGNED_IN_ROLES } from "./shared";

export const AFFILIATE_CAPABILITIES = {
  get_my_affiliate_summary: {
    core: {
      name: "get_my_affiliate_summary",
      label: "Get My Affiliate Summary",
      description:
        "Retrieve the authenticated user's affiliate performance summary including referrals and conversion metrics.",
      category: "system",
      roles: [...SIGNED_IN_ROLES],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_my_affiliate_summary,
      outputHint: "Returns affiliate metrics including referral count, conversions, and revenue",
    },
    runtime: {},
    executorBinding: {
      bundleId: "affiliate",
      executorId: "get_my_affiliate_summary",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_my_affiliate_summary",
      mode: "parse",
    },
    presentation: {
      family: "profile",
      cardKind: "profile_summary",
      executionMode: "inline",
    },
  },

  list_my_referral_activity: {
    core: {
      name: "list_my_referral_activity",
      label: "List My Referral Activity",
      description:
        "List the authenticated user's recent referral activity feed with status updates.",
      category: "system",
      roles: [...SIGNED_IN_ROLES],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_my_referral_activity,
    },
    runtime: {},
    executorBinding: {
      bundleId: "affiliate",
      executorId: "list_my_referral_activity",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_my_referral_activity",
      mode: "parse",
    },
    presentation: {
      family: "profile",
      cardKind: "profile_summary",
      executionMode: "inline",
    },
  },

  get_admin_affiliate_summary: {
    core: {
      name: "get_admin_affiliate_summary",
      label: "Get Admin Affiliate Summary",
      description:
        "Retrieve the system-wide affiliate analytics dashboard for administrative review.",
      category: "system",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_admin_affiliate_summary,
    },
    runtime: {},
    executorBinding: {
      bundleId: "affiliate",
      executorId: "get_admin_affiliate_summary",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_admin_affiliate_summary",
      mode: "parse",
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
  },

  list_admin_referral_exceptions: {
    core: {
      name: "list_admin_referral_exceptions",
      label: "List Admin Referral Exceptions",
      description:
        "List referral entries that require administrative review due to anomalies or policy exceptions.",
      category: "system",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_admin_referral_exceptions,
    },
    runtime: {},
    executorBinding: {
      bundleId: "affiliate",
      executorId: "list_admin_referral_exceptions",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_admin_referral_exceptions",
      mode: "parse",
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;