import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkOrigin } from "@/lib/security/origin-check";
import { buildReferralPath } from "@/lib/referrals/referral-links";
import { LEGACY_REFERRAL_COOKIE_NAME } from "@/lib/referrals/referral-visit";

const SESSION_COOKIE = "lms_session_token";

const ANONYMOUS_CONVERSATION_ROUTES = new Set([
  "/api/conversations/active",
  "/api/conversations/active/archive",
]);

/**
 * Routes that require a session cookie to be present.
 * Full session validation happens in the route handler; the proxy only checks cookie presence.
 */
const PROTECTED_API_PREFIXES = [
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/switch",
];

function isProtectedRoute(pathname: string): boolean {
  if (ANONYMOUS_CONVERSATION_ROUTES.has(pathname)) {
    return false;
  }

  if (
    pathname === "/api/conversations" ||
    pathname.startsWith("/api/conversations/")
  ) {
    return true;
  }

  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function captureReferral(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname !== "/") {
    return null;
  }

  const refCode = request.nextUrl.searchParams.get("ref")?.trim();
  if (!refCode) {
    return null;
  }

  const redirectUrl = new URL(buildReferralPath(refCode), request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "ref") {
      redirectUrl.searchParams.set(key, value);
    }
  });

  const response = NextResponse.redirect(redirectUrl);
  if (request.cookies.get(LEGACY_REFERRAL_COOKIE_NAME)?.value) {
    response.cookies.delete(LEGACY_REFERRAL_COOKIE_NAME);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF: Origin check on state-mutating API requests
  if (pathname.startsWith("/api/")) {
    const originResult = checkOrigin(request);
    if (originResult) return originResult;
  }

  if (!pathname.startsWith("/api/")) {
    const legacyReferralRedirect = captureReferral(request);
    if (legacyReferralRedirect) {
      return legacyReferralRedirect;
    }

    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};