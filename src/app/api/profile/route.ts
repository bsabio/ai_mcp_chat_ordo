import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { createProfileService } from "@/lib/profile/profile-service";
import {
  UserProfileConflictError,
  UserProfileValidationError,
} from "@/core/use-cases/UpdateUserProfileInteractor";
import { UserProfileNotFoundError } from "@/core/use-cases/GetUserProfileInteractor";

function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export async function GET() {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return unauthorized();
  }

  try {
    const profile = await createProfileService().getProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof UserProfileNotFoundError) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; credential?: string | null }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const profile = await createProfileService().updateProfile(user.id, {
      name: body.name,
      email: body.email,
      credential: body.credential,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof UserProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof UserProfileConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof UserProfileNotFoundError) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    throw error;
  }
}