import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { login } from "@/lib/auth";
import { InvalidCredentialsError } from "@/core/use-cases/AuthenticateUserInteractor";
import { migrateAnonymousConversationsToUser } from "@/lib/chat/migrate-anonymous-conversations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const result = await login({ email, password });

    await migrateAnonymousConversationsToUser(result.user.id, "login");

    // Set session cookie only after anonymous migration succeeds.
    const cookieStore = await cookies();
    cookieStore.set("lms_session_token", result.sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
