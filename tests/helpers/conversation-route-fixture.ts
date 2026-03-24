import { NextRequest } from "next/server";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

export const TEST_SESSION_TOKEN = "test-session-token";

export function createValidatedSessionUser(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "usr_123",
    ...overrides,
  };
}

export function createConversationRouteRequest(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  includeSession = true,
) {
  const headers = includeSession
    ? { cookie: `lms_session_token=${TEST_SESSION_TOKEN}` }
    : undefined;

  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers,
  });
}

export function createConversationRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

export function createActiveConversationResult(
  overrides: {
    conversation?: Record<string, unknown>;
    messages?: Array<Record<string, unknown>>;
  } = {},
) {
  return {
    conversation: {
      id: "conv_1",
      routingSnapshot: createConversationRoutingSnapshot({
        lane: "organization",
        confidence: 0.84,
      }),
      ...overrides.conversation,
    },
    messages: overrides.messages ?? [{ id: "msg_1", content: "Hello" }],
  };
}

export function createConversationRouteServicesMock(overrides: {
  getActiveForUser?: unknown;
  archiveActive?: unknown;
  list?: unknown;
  ensureActive?: unknown;
  get?: unknown;
  delete?: unknown;
} = {}) {
  return {
    interactor: {
      getActiveForUser: overrides.getActiveForUser,
      archiveActive: overrides.archiveActive,
      list: overrides.list,
      ensureActive: overrides.ensureActive,
      get: overrides.get,
      delete: overrides.delete,
    },
  };
}