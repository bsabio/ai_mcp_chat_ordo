import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

export function captureReferral(request: NextRequest, response: NextResponse): void {
  const refCode = request.nextUrl.searchParams.get("ref");
  if (refCode && refCode.length > 0 && refCode.length <= 30) {
    // This cookie is attribution-only and never authorizes requests, so we keep SameSite=Lax
    // to preserve referral capture on first-party landing navigations while accepting that
    // the server must treat the value as advisory input rather than a CSRF defense boundary.
    response.cookies.set("lms_referral_code", refCode, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Referral code capture: set cookie on any page route with ?ref= param
  if (!pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    captureReferral(request, response);
    return response;
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