import { NextResponse } from "next/server";
import { getSessionUser, setMockSession, type RoleName } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (user.roles.includes("ANONYMOUS")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // ADMIN (real or simulated) or dev mode required
    const isAdmin = user.roles.includes("ADMIN");
    const isDevMode = process.env.NODE_ENV === "development";

    if (!isAdmin && !isDevMode) {
      return NextResponse.json(
        { error: "Forbidden — ADMIN role required" },
        { status: 403 },
      );
    }

    const { role } = await req.json();

    const allowedRoles: RoleName[] = [
      "ANONYMOUS",
      "AUTHENTICATED",
      "STAFF",
      "ADMIN",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role provided." },
        { status: 400 },
      );
    }

    await setMockSession(role as RoleName);

    return NextResponse.json({ success: true, activeRole: role });
  } catch (error) {
    console.error("Failed to switch role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
