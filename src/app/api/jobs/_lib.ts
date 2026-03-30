import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { errorJson, type RouteContext } from "@/lib/chat/http-facade";

export const DEFAULT_JOBS_LIMIT = 25;
export const DEFAULT_BATCH_LIMIT = 100;
export const DEFAULT_POLL_INTERVAL_MS = 500;
export const DEFAULT_STREAM_WINDOW_MS = 25_000;

export function parsePositiveInteger(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function requireAuthenticatedUser(context: RouteContext) {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return errorJson(context, "Authentication required", 401);
  }

  return user;
}

export async function ensureUserOwnsConversationJob(
  userId: string,
  conversationId: string,
  context: RouteContext,
): Promise<Response | null> {
  const { interactor } = createConversationRouteServices();

  try {
    await interactor.get(conversationId, userId);
    return null;
  } catch {
    return errorJson(context, "Job not found", 404);
  }
}

export function getAfterSequence(request: NextRequest): number {
  return parsePositiveInteger(
    request.nextUrl.searchParams.get("afterSequence")
      ?? request.headers.get("last-event-id")
      ?? undefined,
    0,
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}