import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "lms_session_token";

/**
 * Routes that require a session cookie to be present.
 * Full session validation happens in the route handler — middleware only checks cookie presence.
 */
const PROTECTED_API_PREFIXES = [
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/switch",
  "/api/conversations",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only inspect API routes — pages always render (they resolve auth server-side)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Protected API routes require cookie presence
  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  // All other API routes pass through (public or role-gated in handler)
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
