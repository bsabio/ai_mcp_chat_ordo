import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";

export async function GET() {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const repo = new UserPreferencesDataMapper(getDb());
  const prefs = await repo.getAll(user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const preferences = body.preferences;
  if (!Array.isArray(preferences)) {
    return NextResponse.json(
      { error: "preferences must be an array" },
      { status: 400 },
    );
  }

  const repo = new UserPreferencesDataMapper(getDb());
  for (const { key, value } of preferences) {
    if (typeof key !== "string" || typeof value !== "string") {
      return NextResponse.json(
        { error: "Invalid preference: key and value must be strings" },
        { status: 400 },
      );
    }
    try {
      await repo.set(user.id, key, value);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const updated = await repo.getAll(user.id);
  return NextResponse.json({ preferences: updated });
}
