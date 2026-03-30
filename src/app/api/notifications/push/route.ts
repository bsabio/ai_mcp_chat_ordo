import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPushSubscriptionRepository } from "@/adapters/RepositoryFactory";
import type { BrowserPushSubscription } from "@/core/entities/push-subscription";
import { getSessionUser } from "@/lib/auth";

function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

function isBrowserPushSubscription(value: unknown): value is BrowserPushSubscription {
  return typeof value === "object"
    && value !== null
    && typeof (value as { endpoint?: unknown }).endpoint === "string"
    && typeof (value as { keys?: { p256dh?: unknown; auth?: unknown } }).keys?.p256dh === "string"
    && typeof (value as { keys?: { p256dh?: unknown; auth?: unknown } }).keys?.auth === "string";
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null) as { subscription?: unknown } | null;
  if (!isBrowserPushSubscription(body?.subscription)) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const record = await getPushSubscriptionRepository().upsert({
    userId: user.id,
    subscription: body.subscription,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ subscription: record });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string" || body.endpoint.trim().length === 0) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  await getPushSubscriptionRepository().deleteByEndpoint(body.endpoint);
  return NextResponse.json({ ok: true });
}