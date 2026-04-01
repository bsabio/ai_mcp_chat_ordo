import { getInstanceIdentity } from "@/lib/config/instance";

import { buildReferralPath } from "@/lib/referrals/referral-links";

export type ReferralOriginSource = "environment" | "development-localhost" | "instance-domain";

export interface ReferralOriginResolution {
  origin: string;
  source: ReferralOriginSource;
  localhostFallback: boolean;
  invalidConfiguredOrigin: string | null;
}

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch (error) {
    void error;
    return null;
  }
}

function normalizeDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function resolveReferralPublicOrigin(): ReferralOriginResolution {
  const configuredOrigin = process.env.PUBLIC_SITE_ORIGIN?.trim()
    || process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim()
    || null;
  const normalizedConfiguredOrigin = normalizeOrigin(configuredOrigin ?? undefined);

  if (normalizedConfiguredOrigin) {
    return {
      origin: normalizedConfiguredOrigin,
      source: "environment",
      localhostFallback: false,
      invalidConfiguredOrigin: null,
    };
  }

  if ((process.env.NODE_ENV ?? "development") === "development") {
    const port = process.env.PORT?.trim() || "3000";
    return {
      origin: `http://localhost:${port}`,
      source: "development-localhost",
      localhostFallback: true,
      invalidConfiguredOrigin: configuredOrigin,
    };
  }

  return {
    origin: `https://${normalizeDomain(getInstanceIdentity().domain)}`,
    source: "instance-domain",
    localhostFallback: false,
    invalidConfiguredOrigin: configuredOrigin,
  };
}

export function buildPublicReferralUrl(referralCode: string): string {
  return new URL(buildReferralPath(referralCode), `${resolveReferralPublicOrigin().origin}/`).toString();
}