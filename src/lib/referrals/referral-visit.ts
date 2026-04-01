import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getEnvConfig } from "@/lib/config/env-config";
import { getActiveReferralSnapshot, type ReferralSnapshot } from "@/lib/referrals/referral-resolver";

export const REFERRAL_VISIT_COOKIE_NAME = "lms_referral_visit";
export const LEGACY_REFERRAL_COOKIE_NAME = "lms_referral_code";
const REFERRAL_VISIT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type ReferralVisitPayload = {
  visitId: string;
  code: string;
  issuedAt: string;
};

export interface ValidatedReferralVisit {
  visitId: string;
  code: string;
  issuedAt: string;
  referrer: ReferralSnapshot;
}

function getReferralCookieSecret(): string {
  const explicitSecret = process.env.REFERRAL_COOKIE_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (jwtSecret) {
    return jwtSecret;
  }

  if (getEnvConfig().NODE_ENV === "production") {
    throw new Error("REFERRAL_COOKIE_SECRET or JWT_SECRET must be set in production.");
  }

  return "studio-ordo-local-referral-secret";
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signReferralVisitPayload(encodedPayload: string): string {
  return createHmac("sha256", getReferralCookieSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createReferralVisitCookieValue(code: string): string {
  const payload: ReferralVisitPayload = {
    visitId: randomUUID(),
    code,
    issuedAt: new Date().toISOString(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signReferralVisitPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseReferralVisitPayload(cookieValue: string): ReferralVisitPayload | null {
  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signReferralVisitPayload(encodedPayload);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as ReferralVisitPayload;
    if (
      typeof parsed.visitId !== "string"
      || typeof parsed.code !== "string"
      || typeof parsed.issuedAt !== "string"
      || parsed.visitId.length === 0
      || parsed.code.length === 0
      || parsed.issuedAt.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    void error;
    return null;
  }
}

export function getReferralVisitCookieOptions() {
  return {
    path: "/",
    maxAge: REFERRAL_VISIT_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function resolveValidatedReferralVisit(cookieValue: string | undefined | null): ValidatedReferralVisit | null {
  if (!cookieValue) {
    return null;
  }

  const parsed = parseReferralVisitPayload(cookieValue);
  if (!parsed) {
    return null;
  }

  const referrer = getActiveReferralSnapshot(parsed.code);
  if (!referrer) {
    return null;
  }

  return {
    visitId: parsed.visitId,
    code: referrer.code,
    issuedAt: parsed.issuedAt,
    referrer,
  };
}
