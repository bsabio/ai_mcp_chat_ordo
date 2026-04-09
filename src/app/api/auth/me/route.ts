import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth";
import { InvalidSessionError } from "@/core/use-cases/ValidateSessionInteractor";
import { logFailure } from "@/lib/observability/logger";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lms_session_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await validateSession(token);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }
    logFailure("SESSION_VALIDATION_ERROR", "Session validation error", undefined, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
