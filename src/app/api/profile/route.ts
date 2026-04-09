import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { createProfileService } from "@/lib/profile/profile-service";
import { mapErrorToResponse } from "@/core/common/errors";

function unauthorized() {
  return NextResponse.json({ error: "Authentication required", errorCode: "AUTH_ERROR" }, { status: 401 });
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
    const { status, body } = mapErrorToResponse(error);
    return NextResponse.json(body, { status });
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
    return NextResponse.json({ error: "Invalid request body.", errorCode: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const profile = await createProfileService().updateProfile(user.id, {
      name: body.name,
      email: body.email,
      credential: body.credential,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const { status, body: errorBody } = mapErrorToResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}