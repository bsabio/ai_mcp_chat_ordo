import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { register } from "@/lib/auth";
import {
  ValidationError,
  DuplicateEmailError,
} from "@/core/use-cases/RegisterUserInteractor";
import { migrateAnonymousConversationsToUser } from "@/lib/chat/migrate-anonymous-conversations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "email, password, and name are required" },
        { status: 400 },
      );
    }

    const result = await register({ email, password, name });

    await migrateAnonymousConversationsToUser(result.user.id, "registration");

    // Set session cookie only after anonymous migration succeeds.
    const cookieStore = await cookies();
    cookieStore.set("lms_session_token", result.sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
