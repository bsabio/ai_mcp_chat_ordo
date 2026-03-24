import { NextRequest } from "next/server";

export function createAdminSessionUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "admin_1",
    email: "admin@example.com",
    name: "Admin",
    roles: ["ADMIN"],
    ...overrides,
  };
}

export function createAuthenticatedSessionUser(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "usr_1",
    email: "user@example.com",
    name: "User",
    roles: ["AUTHENTICATED"],
    ...overrides,
  };
}

export function createAnonymousSessionUser(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "anon_1",
    email: "anon@example.com",
    name: "Anon",
    roles: ["ANONYMOUS"],
    ...overrides,
  };
}

export function createStaffSessionUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "staff_1",
    email: "staff@example.com",
    name: "Staff",
    roles: ["STAFF"],
    ...overrides,
  };
}

export function createRouteRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown,
) {
  return new NextRequest(new URL(url), {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}